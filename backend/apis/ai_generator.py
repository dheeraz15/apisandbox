"""AI-powered API generator (rule-based templates for MVP)."""

import random

from .template_library import EXTRA_KEYWORDS, EXTRA_META, EXTRA_TEMPLATES


# Existing templates keep their bodies below; endpoint_type is inferred or set explicitly.
API_TEMPLATES = {
    "account_verification": {
        "name": "Account Verification",
        "description": "Verify account number and return customer information",
        "category": "Core Banking",
        "method": "POST",
        "endpoint": "/account/verify",
        "body_schema": {
            "type": "object",
            "required": ["accountNumber"],
            "properties": {
                "accountNumber": {"type": "string", "minLength": 8},
            },
        },
        "body_example": {"accountNumber": "1001234567"},
        "responses": [
            {
                "status_code": 200,
                "name": "Success",
                "body": {
                    "customerName": "{{faker.name}}",
                    "accountNumber": "{{request.body.accountNumber}}",
                    "status": "ACTIVE",
                    "branch": "{{faker.city}} Branch",
                    "availableBalance": "{{randomFloat}}",
                    "currency": "USD",
                    "verified": True,
                },
            },
            {
                "status_code": 404,
                "name": "Account Not Found",
                "body": {
                    "error": "ACCOUNT_NOT_FOUND",
                    "message": "No account found with the provided number",
                },
            },
            {
                "status_code": 400,
                "name": "Invalid Request",
                "body": {
                    "error": "VALIDATION_ERROR",
                    "message": "accountNumber is required",
                },
            },
        ],
        "rules": [
            {
                "name": "Frozen Account",
                "condition": {
                    "field": "request.body.accountNumber",
                    "operator": "startsWith",
                    "value": "99",
                },
                "response": {
                    "status_code": 403,
                    "body": {
                        "error": "ACCOUNT_FROZEN",
                        "message": "This account has been frozen",
                    },
                },
            },
        ],
        "scenarios": [
            {"name": "default", "label": "Customer Exists"},
            {
                "name": "not_found",
                "label": "Account Not Found",
                "responses": [
                    {
                        "status_code": 404,
                        "body": {
                            "error": "ACCOUNT_NOT_FOUND",
                            "message": "Account not found",
                        },
                    }
                ],
            },
            {
                "name": "frozen",
                "label": "Account Frozen",
                "responses": [
                    {
                        "status_code": 403,
                        "body": {
                            "error": "ACCOUNT_FROZEN",
                            "message": "Account is frozen",
                        },
                    }
                ],
            },
        ],
    },
    "customer_lookup": {
        "name": "Customer Lookup",
        "description": "Search and retrieve customer information",
        "category": "Customer",
        "method": "GET",
        "endpoint": "/customer/{id}",
        "path_params": [
            {"name": "id", "type": "string", "required": True},
        ],
        "responses": [
            {
                "status_code": 200,
                "body": {
                    "customerId": "{{request.path.id}}",
                    "name": "{{faker.name}}",
                    "email": "{{faker.email}}",
                    "phone": "{{faker.phone}}",
                    "address": "{{faker.address}}",
                    "status": "ACTIVE",
                    "createdAt": "{{timestamp}}",
                },
            },
            {
                "status_code": 404,
                "body": {"error": "CUSTOMER_NOT_FOUND"},
            },
        ],
    },
    "credit_card_eligibility": {
        "name": "Credit Card Eligibility",
        "description": "Check credit card eligibility based on customer profile",
        "category": "Credit",
        "method": "POST",
        "endpoint": "/credit-card/eligibility",
        "body_example": {
            "customerId": "CUST-001",
            "annualIncome": 75000,
            "creditScore": 720,
        },
        "responses": [
            {
                "status_code": 200,
                "body": {
                    "eligible": True,
                    "maxCreditLimit": 25000,
                    "recommendedCard": "Platinum Rewards",
                    "interestRate": 18.99,
                    "customerId": "{{request.body.customerId}}",
                },
            },
            {
                "status_code": 422,
                "body": {
                    "eligible": False,
                    "reason": "Credit score below minimum threshold",
                    "minimumRequired": 650,
                },
            },
        ],
    },
    "loan_eligibility": {
        "name": "Loan Eligibility Check",
        "description": "Determine loan eligibility and terms",
        "category": "Lending",
        "method": "POST",
        "endpoint": "/loan/eligibility",
        "body_example": {
            "customerId": "CUST-001",
            "loanAmount": 50000,
            "loanTerm": 36,
            "purpose": "HOME_IMPROVEMENT",
        },
        "responses": [
            {
                "status_code": 200,
                "body": {
                    "eligible": True,
                    "approvedAmount": "{{request.body.loanAmount}}",
                    "interestRate": 7.5,
                    "monthlyPayment": 1557.43,
                    "term": "{{request.body.loanTerm}}",
                    "referenceId": "{{uuid}}",
                },
            },
        ],
    },
    "kyc_verification": {
        "name": "KYC Verification",
        "description": "Know Your Customer identity verification",
        "category": "KYC",
        "method": "POST",
        "endpoint": "/kyc/verify",
        "body_example": {
            "documentType": "PASSPORT",
            "documentNumber": "AB1234567",
            "country": "US",
        },
        "responses": [
            {
                "status_code": 200,
                "body": {
                    "verified": True,
                    "verificationId": "{{uuid}}",
                    "documentType": "{{request.body.documentType}}",
                    "status": "VERIFIED",
                    "verifiedAt": "{{timestamp}}",
                    "riskScore": "{{randomInt}}",
                },
            },
        ],
    },
    "ocr": {
        "name": "OCR Document Processing",
        "description": "Extract text and data from document images",
        "category": "OCR",
        "method": "POST",
        "endpoint": "/ocr/process",
        "body_example": {"documentType": "ID_CARD", "imageBase64": "..."},
        "responses": [
            {
                "status_code": 200,
                "body": {
                    "documentId": "{{uuid}}",
                    "extractedText": "Sample extracted text",
                    "fields": {
                        "fullName": "{{faker.name}}",
                        "dateOfBirth": "1990-01-15",
                        "documentNumber": "DOC-{{randomInt}}",
                        "nationality": "{{faker.country}}",
                    },
                    "confidence": 0.97,
                },
            },
        ],
    },
    "payment": {
        "name": "Process Payment",
        "description": "Process a payment transaction",
        "category": "Payments",
        "method": "POST",
        "endpoint": "/payment",
        "body_example": {
            "amount": 150.00,
            "currency": "USD",
            "fromAccount": "1001234567",
            "toAccount": "2009876543",
        },
        "responses": [
            {
                "status_code": 200,
                "body": {
                    "transactionId": "{{uuid}}",
                    "status": "COMPLETED",
                    "amount": "{{request.body.amount}}",
                    "currency": "{{request.body.currency}}",
                    "timestamp": "{{timestamp}}",
                },
            },
            {
                "status_code": 402,
                "body": {
                    "error": "INSUFFICIENT_FUNDS",
                    "message": "Insufficient balance",
                },
            },
        ],
    },
    "aml_screening": {
        "name": "AML Screening",
        "description": "Anti-Money Laundering customer screening",
        "category": "AML",
        "method": "POST",
        "endpoint": "/aml/screen",
        "body_example": {"name": "John Doe", "dateOfBirth": "1985-06-15"},
        "responses": [
            {
                "status_code": 200,
                "body": {
                    "screeningId": "{{uuid}}",
                    "status": "CLEAR",
                    "riskLevel": "LOW",
                    "matches": [],
                    "screenedAt": "{{timestamp}}",
                },
            },
        ],
        "scenarios": [
            {"name": "default", "label": "Clear"},
            {
                "name": "hit",
                "label": "AML Hit",
                "responses": [
                    {
                        "status_code": 200,
                        "body": {
                            "screeningId": "{{uuid}}",
                            "status": "HIT",
                            "riskLevel": "HIGH",
                            "matches": [{"list": "OFAC", "score": 0.92}],
                        },
                    }
                ],
            },
        ],
    },
    "pep_check": {
        "name": "PEP Check",
        "description": "Politically Exposed Person screening",
        "category": "AML",
        "method": "POST",
        "endpoint": "/pep/check",
        "body_example": {"fullName": "Jane Smith", "country": "US"},
        "responses": [
            {
                "status_code": 200,
                "body": {
                    "checkId": "{{uuid}}",
                    "isPep": False,
                    "confidence": 0.98,
                    "fullName": "{{request.body.fullName}}",
                },
            },
        ],
    },
    "insurance_quote": {
        "name": "Insurance Quote",
        "description": "Generate an insurance premium quote",
        "category": "Insurance",
        "method": "POST",
        "endpoint": "/insurance/quote",
        "body_example": {
            "product": "AUTO",
            "age": 32,
            "coverageAmount": 100000,
        },
        "responses": [
            {
                "status_code": 200,
                "body": {
                    "quoteId": "{{uuid}}",
                    "premium": "{{randomFloat}}",
                    "currency": "USD",
                    "product": "{{request.body.product}}",
                    "validUntil": "{{faker.date}}",
                },
            },
        ],
    },
    "passport_verify": {
        "name": "Passport Verification",
        "description": "Verify passport document details",
        "category": "Government",
        "method": "POST",
        "endpoint": "/passport/verify",
        "body_example": {
            "passportNumber": "AB1234567",
            "country": "US",
            "dateOfBirth": "1990-01-15",
        },
        "responses": [
            {
                "status_code": 200,
                "body": {
                    "verified": True,
                    "holderName": "{{faker.name}}",
                    "nationality": "{{request.body.country}}",
                    "expiryDate": "2030-12-31",
                    "verificationId": "{{uuid}}",
                },
            },
        ],
    },
    "tax_id_lookup": {
        "name": "Tax ID Lookup",
        "description": "Lookup taxpayer information by tax ID",
        "category": "Tax",
        "method": "POST",
        "endpoint": "/tax/lookup",
        "body_example": {"taxId": "12-3456789"},
        "responses": [
            {
                "status_code": 200,
                "body": {
                    "taxId": "{{request.body.taxId}}",
                    "entityName": "{{faker.company}}",
                    "status": "ACTIVE",
                    "jurisdiction": "US-CA",
                },
            },
        ],
    },
    "telecom_sim": {
        "name": "SIM Status Check",
        "description": "Check mobile SIM / MSISDN status",
        "category": "Telecom",
        "method": "GET",
        "endpoint": "/telecom/sim/{msisdn}",
        "path_params": [{"name": "msisdn", "type": "string", "required": True}],
        "responses": [
            {
                "status_code": 200,
                "body": {
                    "msisdn": "{{request.path.msisdn}}",
                    "status": "ACTIVE",
                    "carrier": "{{faker.company}}",
                    "plan": "POSTPAID",
                },
            },
        ],
    },
    "merchant_onboard": {
        "name": "Merchant Onboarding",
        "description": "Onboard a new merchant account",
        "category": "Merchant",
        "method": "POST",
        "endpoint": "/merchant/onboard",
        "body_example": {
            "businessName": "Acme Retail",
            "mcc": "5411",
            "country": "US",
        },
        "responses": [
            {
                "status_code": 201,
                "body": {
                    "merchantId": "{{uuid}}",
                    "status": "PENDING_REVIEW",
                    "businessName": "{{request.body.businessName}}",
                    "createdAt": "{{timestamp}}",
                },
            },
        ],
    },
    "wallet_balance": {
        "name": "Wallet Balance",
        "description": "Get digital wallet balance",
        "category": "Payments",
        "method": "GET",
        "endpoint": "/wallet/{walletId}/balance",
        "path_params": [{"name": "walletId", "type": "string", "required": True}],
        "responses": [
            {
                "status_code": 200,
                "body": {
                    "walletId": "{{request.path.walletId}}",
                    "available": "{{randomFloat}}",
                    "currency": "USD",
                    "updatedAt": "{{timestamp}}",
                },
            },
        ],
    },
    "credit_bureau": {
        "name": "Credit Bureau Report",
        "description": "Fetch credit score and bureau summary",
        "category": "Credit",
        "method": "POST",
        "endpoint": "/credit-bureau/report",
        "body_example": {"ssn": "xxx-xx-1234", "consent": True},
        "responses": [
            {
                "status_code": 200,
                "body": {
                    "reportId": "{{uuid}}",
                    "score": 720,
                    "bureau": "Experian",
                    "riskBand": "LOW",
                    "pulledAt": "{{timestamp}}",
                },
            },
        ],
    },
    "government_registry": {
        "name": "Business Registry Lookup",
        "description": "Lookup company in government registry",
        "category": "Government",
        "method": "GET",
        "endpoint": "/registry/company/{regNumber}",
        "path_params": [
            {"name": "regNumber", "type": "string", "required": True}
        ],
        "responses": [
            {
                "status_code": 200,
                "body": {
                    "registrationNumber": "{{request.path.regNumber}}",
                    "companyName": "{{faker.company}}",
                    "status": "ACTIVE",
                    "incorporationDate": "2015-03-20",
                    "address": "{{faker.address}}",
                },
            },
        ],
    },
    "echo": {
        "name": "Echo API",
        "description": "Echo back whatever you send — great for debugging",
        "category": "Utility",
        "method": "POST",
        "endpoint": "/echo",
        "body_example": {"message": "hello"},
        "responses": [
            {
                "status_code": 200,
                "body": {
                    "echo": "{{request.body}}",
                    "receivedAt": "{{timestamp}}",
                    "requestId": "{{uuid}}",
                },
            },
        ],
    },
}


# Merge expanded catalog
API_TEMPLATES.update(EXTRA_TEMPLATES)


# Explicit endpoint types for legacy templates
_LEGACY_ENDPOINT_TYPES = {
    "account_verification": "action",
    "customer_lookup": "detail",
    "credit_card_eligibility": "action",
    "loan_eligibility": "action",
    "kyc_verification": "action",
    "ocr": "action",
    "payment": "action",
    "aml_screening": "action",
    "pep_check": "action",
    "insurance_quote": "action",
    "passport_verify": "action",
    "tax_id_lookup": "action",
    "telecom_sim": "detail",
    "merchant_onboard": "create",
    "wallet_balance": "detail",
    "credit_bureau": "action",
    "government_registry": "detail",
    "echo": "action",
}

for _k, _etype in _LEGACY_ENDPOINT_TYPES.items():
    if _k in API_TEMPLATES and "endpoint_type" not in API_TEMPLATES[_k]:
        API_TEMPLATES[_k]["endpoint_type"] = _etype


TEMPLATE_META = {
    "account_verification": {
        "icon": "building",
        "popular": True,
        "blurb": "Verify account → customer, status, balance",
    },
    "customer_lookup": {
        "icon": "user",
        "popular": True,
        "blurb": "Fetch customer profile by ID",
    },
    "credit_card_eligibility": {
        "icon": "credit-card",
        "popular": True,
        "blurb": "Check card eligibility & limits",
    },
    "loan_eligibility": {
        "icon": "landmark",
        "popular": True,
        "blurb": "Loan approval & payment estimate",
    },
    "kyc_verification": {
        "icon": "shield",
        "popular": True,
        "blurb": "Document-based KYC verify",
    },
    "ocr": {"icon": "scan", "popular": True, "blurb": "Extract fields from documents"},
    "payment": {"icon": "banknote", "popular": True, "blurb": "Process a payment"},
    "aml_screening": {"icon": "search", "popular": True, "blurb": "AML / sanctions screen"},
    "pep_check": {"icon": "user-check", "popular": False, "blurb": "PEP screening"},
    "insurance_quote": {"icon": "umbrella", "popular": False, "blurb": "Insurance premium quote"},
    "passport_verify": {"icon": "book", "popular": False, "blurb": "Passport verification"},
    "tax_id_lookup": {"icon": "receipt", "popular": False, "blurb": "Tax ID / TIN lookup"},
    "telecom_sim": {"icon": "smartphone", "popular": False, "blurb": "SIM / MSISDN status"},
    "merchant_onboard": {"icon": "store", "popular": False, "blurb": "Merchant onboarding"},
    "wallet_balance": {"icon": "wallet", "popular": False, "blurb": "Wallet balance check"},
    "credit_bureau": {"icon": "bar-chart", "popular": True, "blurb": "Credit score report"},
    "government_registry": {
        "icon": "landmark",
        "popular": False,
        "blurb": "Company registry lookup",
    },
    "echo": {"icon": "repeat", "popular": False, "blurb": "Echo request for debugging"},
}

TEMPLATE_META.update(EXTRA_META)


KEYWORD_MAP = {
    "account": "account_verification",
    "verify": "account_verification",
    "verification": "account_verification",
    "customer": "customer_lookup",
    "lookup": "customer_lookup",
    "search": "customer_lookup",
    "credit card": "credit_card_eligibility",
    "credit-card": "credit_card_eligibility",
    "eligibility": "credit_card_eligibility",
    "loan": "loan_eligibility",
    "kyc": "kyc_verification",
    "identity": "kyc_verification",
    "ocr": "ocr",
    "document": "ocr",
    "payment": "payment",
    "pay": "payment",
    "transaction": "payment",
    "aml": "aml_screening",
    "money laundering": "aml_screening",
    "screening": "aml_screening",
    "pep": "pep_check",
    "insurance": "insurance_quote",
    "passport": "passport_verify",
    "tax": "tax_id_lookup",
    "telecom": "telecom_sim",
    "sim": "telecom_sim",
    "merchant": "merchant_onboard",
    "wallet": "wallet_balance",
    "bureau": "credit_bureau",
    "credit score": "credit_bureau",
    "registry": "government_registry",
    "echo": "echo",
}

KEYWORD_MAP.update(EXTRA_KEYWORDS)


def infer_endpoint_type(tpl: dict) -> str:
    if tpl.get("endpoint_type"):
        return tpl["endpoint_type"]
    method = (tpl.get("method") or "GET").upper()
    endpoint = tpl.get("endpoint") or ""
    if "{" in endpoint and method == "GET":
        return "detail"
    if method == "GET":
        return "list"
    if method == "DELETE":
        return "delete"
    if method in ("PUT", "PATCH"):
        return "update"
    action_tokens = (
        "verify",
        "screen",
        "check",
        "eligibility",
        "process",
        "quote",
        "lookup",
        "echo",
        "login",
        "send",
        "track",
    )
    if method == "POST" and any(tok in endpoint.lower() for tok in action_tokens):
        return "action"
    if method == "POST":
        return "create"
    return "action"


def list_templates() -> list:
    items = []
    for key, tpl in API_TEMPLATES.items():
        meta = TEMPLATE_META.get(key, {})
        items.append(
            {
                "key": key,
                "name": tpl.get("name"),
                "description": tpl.get("description"),
                "category": tpl.get("category"),
                "method": tpl.get("method"),
                "endpoint": tpl.get("endpoint"),
                "endpoint_type": infer_endpoint_type(tpl),
                "icon": meta.get("icon", "globe"),
                "popular": meta.get("popular", False),
                "blurb": meta.get("blurb", tpl.get("description", "")),
            }
        )
    items.sort(key=lambda x: (not x["popular"], x["category"] or "", x["name"] or ""))
    return items


def get_template(key: str) -> dict | None:
    tpl = API_TEMPLATES.get(key)
    if not tpl:
        return None
    result = dict(tpl)
    result["endpoint_type"] = infer_endpoint_type(result)
    return result


def generate_api_from_prompt(prompt: str) -> dict:
    prompt_lower = prompt.lower()
    template_key = None

    for keyword, key in KEYWORD_MAP.items():
        if keyword in prompt_lower:
            template_key = key
            break

    if template_key and template_key in API_TEMPLATES:
        result = dict(API_TEMPLATES[template_key])
    else:
        result = _generate_generic_from_prompt(prompt)

    result["tags"] = list(result.get("tags", [])) + ["ai-generated"]
    result["auth_type"] = result.get("auth_type", "none")
    result["state_mode"] = result.get("state_mode", "stateless")
    result["active_scenario"] = result.get("active_scenario", "default")
    result["behavior"] = result.get("behavior", {"delay_ms": random.randint(80, 300)})
    result["cors_enabled"] = True
    result["endpoint_type"] = infer_endpoint_type(result)
    result["scenarios"] = result.get("scenarios") or [
        {"name": "default", "label": "Default"},
        {"name": "error", "label": "Error", "responses": [
            {"status_code": 500, "body": {"error": "INTERNAL_ERROR", "message": "Simulated failure"}}
        ]},
    ]
    if not result.get("name"):
        result["name"] = _extract_name(prompt)
    return result


def _generate_generic_from_prompt(prompt: str) -> dict:
    """Build a mock API from any natural-language prompt without LLM."""
    import re

    prompt_lower = prompt.lower()
    words = re.findall(r"[a-zA-Z]+", prompt_lower)

    # Detect HTTP method intent
    method = "POST"
    if any(w in prompt_lower for w in ["get ", "fetch ", "retrieve ", "lookup ", "list ", "read "]):
        method = "GET"
    elif any(w in prompt_lower for w in ["update ", "patch ", "modify "]):
        method = "PATCH"
    elif any(w in prompt_lower for w in ["delete ", "remove "]):
        method = "DELETE"
    elif any(w in prompt_lower for w in ["put ", "replace "]):
        method = "PUT"

    # Extract resource noun (simple heuristic)
    resource = "resource"
    skip = {"a", "an", "the", "create", "build", "make", "api", "that", "which", "with", "for", "and", "or", "to", "from", "returns", "return", "accepts", "accept"}
    nouns = [w for w in words if w not in skip and len(w) > 2]
    if nouns:
        resource = nouns[0]
        if len(nouns) > 1 and nouns[1] not in ("api", "endpoint"):
            resource = nouns[0] if nouns[0] != "mock" else nouns[1] if len(nouns) > 1 else "resource"

    endpoint = f"/{resource.replace('_', '-')}"
    endpoint_type = "action"
    if method == "GET":
        if "id" in prompt_lower or "by id" in prompt_lower or "detail" in prompt_lower:
            endpoint = f"/{resource.replace('_', '-')}/{{id}}"
            endpoint_type = "detail"
        else:
            endpoint_type = "list"
    elif method == "DELETE":
        endpoint_type = "delete"
        if "{" not in endpoint:
            endpoint = f"/{resource.replace('_', '-')}/{{id}}"
    elif method in ("PUT", "PATCH"):
        endpoint_type = "update"
        if "{" not in endpoint:
            endpoint = f"/{resource.replace('_', '-')}/{{id}}"
    elif method == "POST":
        if any(w in prompt_lower for w in ["verify", "check", "screen", "login", "send"]):
            endpoint_type = "action"
        else:
            endpoint_type = "create"

    fields = _extract_fields_from_prompt(prompt)
    body_example = {f: _sample_value(f) for f in fields[:5]} if fields else {"input": "value"}

    if endpoint_type == "list":
        item = {"id": "{{uuid}}"}
        for f in fields[:6]:
            item[f] = f"{{{{faker.{_faker_for(f)}}}}}"
        if not fields:
            item["name"] = "{{faker.name}}"
            item["value"] = "{{randomInt}}"
        response_body = {"items": [item], "total": 1, "page": 1}
    else:
        response_body = {
            "id": "{{uuid}}",
            "status": "success",
            "createdAt": "{{timestamp}}",
        }
        for f in fields[:6]:
            response_body[f] = (
                f"{{{{request.body.{f}}}}}" if method != "GET" else f"{{{{faker.{_faker_for(f)}}}}}"
            )
        if not fields:
            response_body["data"] = {"message": "{{faker.sentence}}", "value": "{{randomInt}}"}

    name = _extract_name(prompt)
    category = _guess_category(prompt_lower)

    return {
        "name": name,
        "description": prompt.strip()[:500],
        "category": category,
        "method": method,
        "endpoint": endpoint,
        "endpoint_type": endpoint_type,
        "body_type": "json",
        "body_example": body_example if method in ("POST", "PUT", "PATCH") else {},
        "responses": [
            {"status_code": 200, "name": "Success", "body": response_body},
            {"status_code": 400, "name": "Bad Request", "body": {"error": "VALIDATION_ERROR"}},
            {"status_code": 404, "name": "Not Found", "body": {"error": "NOT_FOUND"}},
        ],
        "rules": [],
    }


def _extract_fields_from_prompt(prompt: str) -> list:
    import re
    fields = []
    patterns = [
        r"accepts?\s+(\w+(?:\s+and\s+\w+)*)",
        r"returns?\s+(\w+(?:,\s*\w+)*)",
        r"with\s+(\w+(?:,\s*\w+)*)",
        r"(\w+)\s+and\s+(\w+)",
    ]
    for pat in patterns:
        m = re.search(pat, prompt, re.I)
        if m:
            chunk = m.group(1) if m.lastindex else ""
            for part in re.split(r"[\s,]+and[\s,]+|[,\s]+", chunk):
                f = _to_camel(part.strip())
                if f and len(f) > 1 and f not in fields:
                    fields.append(f)
    return fields[:8]


def _to_camel(word: str) -> str:
    parts = word.replace("-", " ").replace("_", " ").split()
    if not parts:
        return ""
    return parts[0].lower() + "".join(p.capitalize() for p in parts[1:])


def _sample_value(field: str) -> str:
    f = field.lower()
    if "email" in f:
        return "user@example.com"
    if "phone" in f:
        return "+15551234567"
    if "id" in f:
        return "abc-123"
    if "amount" in f or "price" in f or "balance" in f:
        return 100.0
    if "count" in f or "quantity" in f:
        return 1
    if "date" in f:
        return "2026-01-01"
    return "sample"


def _faker_for(field: str) -> str:
    f = field.lower()
    if "email" in f:
        return "email"
    if "phone" in f:
        return "phone"
    if "name" in f:
        return "name"
    if "address" in f:
        return "address"
    if "company" in f:
        return "company"
    if "city" in f:
        return "city"
    if "country" in f:
        return "country"
    return "word"


def _guess_category(prompt: str) -> str:
    cats = {
        "General": ["order", "product", "user", "customer", "item", "resource"],
        "Payments": ["payment", "pay", "transaction", "invoice", "billing"],
        "Auth": ["auth", "login", "token", "session", "oauth"],
        "Integration": ["webhook", "callback", "notify", "event"],
        "Search": ["search", "query", "filter", "find", "list"],
        "IoT": ["device", "sensor", "telemetry"],
        "Healthcare": ["patient", "health", "medical", "prescription"],
        "E-commerce": ["cart", "checkout", "shipping", "inventory"],
    }
    for cat, keywords in cats.items():
        if any(k in prompt for k in keywords):
            return cat
    return "General"


def _extract_name(prompt: str) -> str:
    words = prompt.strip().split()[:6]
    return " ".join(w.capitalize() for w in words)
