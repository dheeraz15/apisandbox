"""Core mock API runtime engine."""

import json
import random
import time
import uuid
from django.utils import timezone
from .template_engine import resolve_json
from .rule_engine import evaluate_rules


class MockAPIEngine:
    def __init__(self, api):
        self.api = api

    def process_request(
        self,
        method: str,
        path: str,
        headers: dict,
        query_params: dict,
        body=None,
        path_params: dict = None,
        client_ip: str = "",
        dry_run: bool = False,
    ) -> dict:
        start = time.time()

        if not self.api.is_deployed and not dry_run:
            return {
                "status": 404,
                "body": {"error": "API not deployed"},
                "headers": {},
                "latency_ms": 0,
            }

        auth_error = self._check_auth(headers)
        if auth_error:
            latency = int((time.time() - start) * 1000)
            return {
                "status": auth_error["status"],
                "body": auth_error["body"],
                "headers": {},
                "latency_ms": latency,
            }

        rate_error = self._check_rate_limit(client_ip)
        if rate_error:
            latency = int((time.time() - start) * 1000)
            if not dry_run:
                self._log_request(
                    method,
                    path,
                    headers,
                    body,
                    429,
                    rate_error["body"],
                    {},
                    latency,
                    client_ip,
                    "rate_limit",
                    query_params or {},
                )
            return {
                "status": 429,
                "body": rate_error["body"],
                "headers": {"Retry-After": "60"},
                "latency_ms": latency,
            }

        self._apply_delay()

        context = self._build_context(
            method, path, headers, query_params, body, path_params or {}
        )

        response, finding = self._select_response(context)

        if self.api.state_mode == "stateful" and not dry_run:
            self._handle_state(method, body, path_params or {}, response)

        resolved_body = resolve_json(response.get("body", {}), context)
        resolved_headers = {}
        for h in response.get("headers", []):
            if isinstance(h, dict):
                resolved_headers[h.get("key", "")] = resolve_template_value(
                    h.get("value", ""), context
                )

        for h in self.api.custom_response_headers or []:
            if isinstance(h, dict):
                resolved_headers[h.get("key", "")] = resolve_template_value(
                    h.get("value", ""), context
                )

        latency = int((time.time() - start) * 1000)

        if not dry_run:
            self._log_request(
                method,
                path,
                headers,
                body,
                response.get("status_code", 200),
                resolved_body,
                resolved_headers,
                latency,
                client_ip,
                finding,
                query_params,
            )
            self._update_stats()
            self._fire_outgoing_webhooks(resolved_body, response.get("status_code", 200))

        return {
            "status": response.get("status_code", 200),
            "body": resolved_body,
            "headers": resolved_headers,
            "latency_ms": latency,
            "scenario": self.api.active_scenario,
            "finding": finding,
        }

    def _check_rate_limit(self, client_ip: str) -> dict | None:
        limit = self.api.rate_limit
        if not limit:
            return None

        from logs.models import RequestLog
        from datetime import timedelta

        since = timezone.now() - timedelta(minutes=1)
        count = RequestLog.objects.filter(
            api=self.api, created_at__gte=since
        ).count()
        if count >= limit:
            return {
                "body": {
                    "error": "RATE_LIMIT_EXCEEDED",
                    "message": f"Limit of {limit} requests per minute exceeded",
                    "limit": limit,
                }
            }
        return None

    def _check_auth(self, headers: dict) -> dict | None:
        auth_type = self.api.auth_type
        if auth_type == "none":
            return None

        config = self.api.auth_config or {}
        normalized = {k.lower(): v for k, v in headers.items()}

        if auth_type == "api_key":
            header_name = config.get("header", "X-API-Key").lower()
            expected = config.get("key", "")
            actual = normalized.get(header_name, "")
            if actual != expected:
                return {
                    "status": 401,
                    "body": {"error": "Invalid API key"},
                }

        elif auth_type == "bearer":
            auth = normalized.get("authorization", "")
            expected = config.get("token", "")
            if not auth.startswith("Bearer ") or auth[7:] != expected:
                return {
                    "status": 401,
                    "body": {"error": "Invalid bearer token"},
                }

        elif auth_type == "basic":
            import base64

            auth = normalized.get("authorization", "")
            if not auth.startswith("Basic "):
                return {"status": 401, "body": {"error": "Basic auth required"}}
            try:
                decoded = base64.b64decode(auth[6:]).decode()
                username, password = decoded.split(":", 1)
                if (
                    username != config.get("username")
                    or password != config.get("password")
                ):
                    return {"status": 401, "body": {"error": "Invalid credentials"}}
            except Exception:
                return {"status": 401, "body": {"error": "Invalid credentials"}}

        elif auth_type == "custom":
            header_name = config.get("header", "").lower()
            expected = config.get("value", "")
            if normalized.get(header_name, "") != expected:
                return {
                    "status": 401,
                    "body": {"error": "Authentication failed"},
                }

        return None

    def _apply_delay(self):
        behavior = self.api.behavior or {}
        delay_ms = behavior.get("delay_ms", 0)
        if behavior.get("random_delay"):
            min_d = behavior.get("min_delay_ms", 0)
            max_d = behavior.get("max_delay_ms", 1000)
            delay_ms = random.randint(min_d, max_d)
        if delay_ms > 0:
            time.sleep(delay_ms / 1000.0)

    def _build_context(self, method, path, headers, query, body, path_params):
        workspace_vars = {}
        for var in self.api.workspace.variables.all():
            workspace_vars[var.key] = var.value

        scenario_data = {}
        for s in self.api.scenarios or []:
            if s.get("name") == self.api.active_scenario:
                scenario_data = s
                break

        return {
            "request": {
                "method": method,
                "path": path,
                "headers": headers,
                "query": query,
                "body": body if isinstance(body, dict) else {},
                "path_params": path_params,
            },
            "workspace": {
                "id": str(self.api.workspace.id),
                "slug": self.api.workspace.slug,
                "name": self.api.workspace.name,
            },
            "env": workspace_vars,
            "scenario": scenario_data,
        }

    def _select_response(self, context: dict) -> tuple[dict, str]:
        rule_response, rule_name = evaluate_rules(self.api.rules or [], context)
        if rule_response:
            return rule_response, f"rule:{rule_name}"

        behavior = self.api.behavior or {}
        probabilities = behavior.get("probabilities", [])
        if probabilities:
            roll = random.random() * 100
            cumulative = 0
            for prob in probabilities:
                cumulative += prob.get("percentage", 0)
                if roll <= cumulative:
                    status_code = prob.get("status_code", 200)
                    for resp in self.api.responses or []:
                        if resp.get("status_code") == status_code:
                            return resp, f"probability:{status_code}"
                    return {
                        "status_code": status_code,
                        "body": {"error": f"Simulated {status_code}"},
                    }, f"probability:{status_code}"

        scenario_name = self.api.active_scenario or "default"
        scenario_responses = None
        for s in self.api.scenarios or []:
            if s.get("name") == scenario_name:
                scenario_responses = s.get("responses")
                break

        responses = scenario_responses or self.api.responses or []
        finding = (
            f"scenario:{scenario_name}"
            if scenario_responses
            else "default_response"
        )
        if responses:
            default = next(
                (r for r in responses if r.get("status_code") == 200), None
            )
            return (default or responses[0]), finding

        return {
            "status_code": 200,
            "body": {"message": "OK"},
            "headers": [],
        }, finding

    def _handle_state(self, method, body, path_params, response):
        state = self.api.state_data or {}
        records = state.get("records", [])

        if method == "POST" and body:
            record = {
                "id": str(uuid.uuid4()),
                **(body if isinstance(body, dict) else {}),
            }
            records.append(record)
            state["records"] = records
            self.api.state_data = state
            self.api.save(update_fields=["state_data"])

        elif method == "GET" and path_params:
            record_id = path_params.get("id")
            if record_id:
                found = next(
                    (r for r in records if str(r.get("id")) == str(record_id)),
                    None,
                )
                if not found:
                    response["status_code"] = 404
                    response["body"] = {"error": "Not found"}

        elif method in ("PUT", "PATCH") and path_params and body:
            record_id = path_params.get("id")
            for i, r in enumerate(records):
                if str(r.get("id")) == str(record_id):
                    if isinstance(body, dict):
                        records[i] = {**r, **body}
                    state["records"] = records
                    self.api.state_data = state
                    self.api.save(update_fields=["state_data"])
                    return
            response["status_code"] = 404
            response["body"] = {"error": "Not found"}

        elif method == "DELETE" and path_params:
            record_id = path_params.get("id")
            new_records = [
                r for r in records if str(r.get("id")) != str(record_id)
            ]
            if len(new_records) == len(records):
                response["status_code"] = 404
                response["body"] = {"error": "Not found"}
            else:
                state["records"] = new_records
                self.api.state_data = state
                self.api.save(update_fields=["state_data"])
                response["body"] = {"deleted": True}

    def _log_request(
        self,
        method,
        path,
        headers,
        body,
        status_code,
        response_body,
        response_headers,
        latency,
        ip,
        finding,
        query_params,
    ):
        from logs.models import RequestLog

        RequestLog.objects.create(
            workspace=self.api.workspace,
            api=self.api,
            collection=self.api.collection,
            method=method,
            path=path,
            request_headers=headers,
            request_body=body if isinstance(body, (dict, list)) else {},
            query_params=query_params or {},
            status_code=status_code,
            response_body=(
                response_body
                if isinstance(response_body, (dict, list))
                else {"raw": str(response_body)}
            ),
            response_headers=response_headers or {},
            latency_ms=latency,
            client_ip=ip or None,
            scenario_used=self.api.active_scenario or "",
            rule_matched=finding if finding and finding.startswith("rule:") else "",
            finding=finding or "",
            user_agent=(headers or {}).get("User-Agent", "")
            or (headers or {}).get("user-agent", ""),
        )

    def _fire_outgoing_webhooks(self, response_body, status_code):
        import threading
        import urllib.request

        from logs.models import OutgoingWebhook

        hooks = list(
            OutgoingWebhook.objects.filter(
                workspace=self.api.workspace, enabled=True
            )
        )
        hooks = [
            h
            for h in hooks
            if h.api_id is None or str(h.api_id) == str(self.api.id)
        ]

        payload = json.dumps(
            {
                "event": "api.response",
                "api_id": str(self.api.id),
                "api_name": self.api.name,
                "status_code": status_code,
                "body": response_body,
            },
            default=str,
        ).encode()

        def send(hook):
            try:
                req = urllib.request.Request(
                    hook.url,
                    data=payload,
                    method=hook.method or "POST",
                    headers={
                        "Content-Type": "application/json",
                        **(hook.headers or {}),
                    },
                )
                urllib.request.urlopen(req, timeout=5)
            except Exception:
                pass

        for hook in hooks:
            threading.Thread(target=send, args=(hook,), daemon=True).start()

    def _update_stats(self):
        self.api.total_requests += 1
        self.api.request_count_today += 1
        self.api.last_hit_at = timezone.now()
        self.api.save(
            update_fields=[
                "total_requests",
                "request_count_today",
                "last_hit_at",
            ]
        )


def resolve_template_value(value, context):
    from .template_engine import resolve_template

    return resolve_template(str(value), context)
