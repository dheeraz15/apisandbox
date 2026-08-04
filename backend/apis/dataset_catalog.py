"""Premade datasets users can search and clone into a workspace."""

DATASET_CATALOG = [
    {
        "key": "customers_vip",
        "name": "Customers — VIP cohort",
        "category": "Customer",
        "description": "High-value retail banking customers for KYC / CRM mocks.",
        "tags": ["customer", "banking", "vip"],
        "data": {
            "records": [
                {
                    "customerId": "CUST-1001",
                    "name": "Ava Chen",
                    "email": "ava.chen@example.com",
                    "status": "VIP",
                    "riskScore": 12,
                    "country": "US",
                },
                {
                    "customerId": "CUST-1002",
                    "name": "Noah Patel",
                    "email": "noah.patel@example.com",
                    "status": "VIP",
                    "riskScore": 18,
                    "country": "GB",
                },
                {
                    "customerId": "CUST-1003",
                    "name": "Mia Rossi",
                    "email": "mia.rossi@example.com",
                    "status": "VIP",
                    "riskScore": 9,
                    "country": "IT",
                },
            ]
        },
    },
    {
        "key": "customers_flagged",
        "name": "Customers — flagged / fraud",
        "category": "AML",
        "description": "Accounts flagged for review — useful for rule testing.",
        "tags": ["aml", "fraud", "customer"],
        "data": {
            "records": [
                {
                    "customerId": "CUST-9001",
                    "name": "Jordan Blake",
                    "status": "FLAGGED",
                    "riskScore": 98,
                    "reason": "SANCTIONS_HIT",
                },
                {
                    "customerId": "CUST-9002",
                    "name": "Sam Rivera",
                    "status": "FLAGGED",
                    "riskScore": 87,
                    "reason": "VELOCITY_SPIKE",
                },
            ]
        },
    },
    {
        "key": "products_catalog",
        "name": "Products — sample catalog",
        "category": "E-commerce",
        "description": "SKUs with price and inventory for listing endpoints.",
        "tags": ["ecommerce", "products", "sku"],
        "data": {
            "records": [
                {"id": "prod_01", "sku": "SKU-1001", "name": "Aurora Headphones", "price": 129.0, "currency": "USD", "inStock": True, "category": "audio"},
                {"id": "prod_02", "sku": "SKU-1002", "name": "Nimbus Keyboard", "price": 89.0, "currency": "USD", "inStock": True, "category": "peripherals"},
                {"id": "prod_03", "sku": "SKU-1003", "name": "Pulse Watch", "price": 199.0, "currency": "USD", "inStock": False, "category": "wearables"},
                {"id": "prod_04", "sku": "SKU-1004", "name": "Orbit Charger", "price": 39.0, "currency": "USD", "inStock": True, "category": "accessories"},
                {"id": "prod_05", "sku": "SKU-1005", "name": "Cascade Backpack", "price": 74.0, "currency": "USD", "inStock": True, "category": "bags"},
            ]
        },
    },
    {
        "key": "orders_mixed",
        "name": "Orders — mixed statuses",
        "category": "E-commerce",
        "description": "Orders across pending, shipped, cancelled for scenario testing.",
        "tags": ["orders", "ecommerce"],
        "data": {
            "records": [
                {"orderId": "ord_01", "status": "PENDING", "total": 218.0, "currency": "USD", "customerId": "CUST-1001"},
                {"orderId": "ord_02", "status": "SHIPPED", "total": 89.0, "currency": "USD", "customerId": "CUST-1002"},
                {"orderId": "ord_03", "status": "CANCELLED", "total": 39.0, "currency": "USD", "customerId": "CUST-1003"},
                {"orderId": "ord_04", "status": "DELIVERED", "total": 328.0, "currency": "USD", "customerId": "CUST-1001"},
            ]
        },
    },
    {
        "key": "bank_accounts",
        "name": "Bank accounts — retail",
        "category": "Core Banking",
        "description": "Checking and savings accounts with balances.",
        "tags": ["banking", "accounts"],
        "data": {
            "records": [
                {"accountNumber": "1001234567", "type": "CHECKING", "currency": "USD", "availableBalance": 4521.33, "status": "ACTIVE", "customerId": "CUST-1001"},
                {"accountNumber": "1001234999", "type": "SAVINGS", "currency": "USD", "availableBalance": 12000.0, "status": "ACTIVE", "customerId": "CUST-1001"},
                {"accountNumber": "9900001122", "type": "CHECKING", "currency": "USD", "availableBalance": 0.0, "status": "FROZEN", "customerId": "CUST-9001"},
            ]
        },
    },
    {
        "key": "transactions_retail",
        "name": "Transactions — 30-day sample",
        "category": "Core Banking",
        "description": "Debits and credits for statement mocks.",
        "tags": ["banking", "transactions"],
        "data": {
            "records": [
                {"id": "txn_01", "accountNumber": "1001234567", "amount": -42.5, "description": "POS Purchase", "postedAt": "2026-08-01T16:22:00Z"},
                {"id": "txn_02", "accountNumber": "1001234567", "amount": 1500.0, "description": "Payroll", "postedAt": "2026-07-31T08:00:00Z"},
                {"id": "txn_03", "accountNumber": "1001234567", "amount": -9.99, "description": "Subscription", "postedAt": "2026-07-28T12:00:00Z"},
                {"id": "txn_04", "accountNumber": "1001234999", "amount": 200.0, "description": "Transfer In", "postedAt": "2026-07-20T10:15:00Z"},
            ]
        },
    },
    {
        "key": "payments_auth",
        "name": "Payments — auth results",
        "category": "Payments",
        "description": "Authorized, declined, and pending payment outcomes.",
        "tags": ["payments", "auth"],
        "data": {
            "records": [
                {"paymentId": "pay_8f2a", "amount": 120.0, "currency": "USD", "status": "authorized", "authCode": "A91X"},
                {"paymentId": "pay_3c11", "amount": 45.0, "currency": "USD", "status": "declined", "reason": "INSUFFICIENT_FUNDS"},
                {"paymentId": "pay_77ab", "amount": 890.0, "currency": "USD", "status": "pending", "authCode": None},
            ]
        },
    },
    {
        "key": "kyc_documents",
        "name": "KYC — document samples",
        "category": "KYC",
        "description": "Passport / ID verification payload samples.",
        "tags": ["kyc", "documents"],
        "data": {
            "records": [
                {"documentType": "PASSPORT", "documentNumber": "AB1234567", "country": "US", "verified": True, "name": "Ava Chen"},
                {"documentType": "NATIONAL_ID", "documentNumber": "ID-882211", "country": "NP", "verified": True, "name": "Ravi Shrestha"},
                {"documentType": "PASSPORT", "documentNumber": "XX0000000", "country": "XX", "verified": False, "name": "Unknown"},
            ]
        },
    },
    {
        "key": "aml_hits",
        "name": "AML — screening results",
        "category": "AML",
        "description": "Match / no-match AML screening outcomes.",
        "tags": ["aml", "screening"],
        "data": {
            "records": [
                {"caseId": "aml_9f2a", "name": "Jordan Blake", "match": True, "score": 0.92, "lists": ["OFAC"]},
                {"caseId": "aml_1aa0", "name": "Ava Chen", "match": False, "score": 0.08, "lists": []},
                {"caseId": "aml_44c2", "name": "Shell Corp Ltd", "match": True, "score": 0.81, "lists": ["PEP", "ADVERSE_MEDIA"]},
            ]
        },
    },
    {
        "key": "patients",
        "name": "Patients — clinic roster",
        "category": "Healthcare",
        "description": "Demographics for EMR-style mocks.",
        "tags": ["healthcare", "patients"],
        "data": {
            "records": [
                {"patientId": "pat_01", "name": "Elena Ortiz", "dob": "1988-04-12", "mrn": "MRN-88421", "status": "ACTIVE", "allergies": ["Penicillin"]},
                {"patientId": "pat_02", "name": "James Wu", "dob": "1975-11-02", "mrn": "MRN-11902", "status": "ACTIVE", "allergies": []},
                {"patientId": "pat_03", "name": "Priya Nair", "dob": "1992-07-19", "mrn": "MRN-33018", "status": "INACTIVE", "allergies": ["Latex"]},
            ]
        },
    },
    {
        "key": "appointments",
        "name": "Appointments — week sample",
        "category": "Healthcare",
        "description": "Scheduled / completed / cancelled appointments.",
        "tags": ["healthcare", "appointments"],
        "data": {
            "records": [
                {"appointmentId": "apt_01", "patientId": "pat_01", "providerId": "prv_09", "startsAt": "2026-08-10T14:00:00Z", "status": "SCHEDULED"},
                {"appointmentId": "apt_02", "patientId": "pat_02", "providerId": "prv_03", "startsAt": "2026-08-09T09:30:00Z", "status": "COMPLETED"},
                {"appointmentId": "apt_03", "patientId": "pat_03", "providerId": "prv_09", "startsAt": "2026-08-11T11:00:00Z", "status": "CANCELLED"},
            ]
        },
    },
    {
        "key": "shipments",
        "name": "Shipments — tracking set",
        "category": "Logistics",
        "description": "Carrier shipments with statuses.",
        "tags": ["logistics", "shipping"],
        "data": {
            "records": [
                {"shipmentId": "shp_01", "trackingNumber": "1Z999AA10123456784", "status": "IN_TRANSIT", "carrier": "UPS", "eta": "2026-08-08T18:00:00Z"},
                {"shipmentId": "shp_02", "trackingNumber": "9400111899223344556677", "status": "DELIVERED", "carrier": "USPS", "eta": "2026-08-02T12:00:00Z"},
                {"shipmentId": "shp_03", "trackingNumber": "794612345678", "status": "EXCEPTION", "carrier": "FedEx", "eta": None},
            ]
        },
    },
    {
        "key": "employees",
        "name": "Employees — directory",
        "category": "HR",
        "description": "Headcount sample across departments.",
        "tags": ["hr", "employees"],
        "data": {
            "records": [
                {"employeeId": "emp_01", "name": "Alex Kim", "title": "Senior Engineer", "department": "Platform", "status": "ACTIVE", "email": "alex@acme.test"},
                {"employeeId": "emp_02", "name": "Samira Ali", "title": "People Ops", "department": "HR", "status": "ACTIVE", "email": "samira@acme.test"},
                {"employeeId": "emp_03", "name": "Chris Boone", "title": "Account Executive", "department": "Sales", "status": "ON_LEAVE", "email": "chris@acme.test"},
            ]
        },
    },
    {
        "key": "subscriptions",
        "name": "Subscriptions — SaaS plans",
        "category": "SaaS",
        "description": "Active and cancelled subscriptions with MRR.",
        "tags": ["saas", "billing"],
        "data": {
            "records": [
                {"id": "sub_01", "customerId": "CUST-1001", "plan": "pro", "status": "active", "mrr": 49, "seats": 5},
                {"id": "sub_02", "customerId": "CUST-1002", "plan": "enterprise", "status": "active", "mrr": 499, "seats": 40},
                {"id": "sub_03", "customerId": "CUST-1003", "plan": "starter", "status": "cancelled", "mrr": 0, "seats": 1},
            ]
        },
    },
    {
        "key": "invoices",
        "name": "Invoices — open & paid",
        "category": "SaaS",
        "description": "Invoice states for billing UIs.",
        "tags": ["saas", "invoices"],
        "data": {
            "records": [
                {"invoiceId": "inv_01", "amountDue": 149.0, "currency": "USD", "status": "open", "customerId": "CUST-1001"},
                {"invoiceId": "inv_02", "amountDue": 0.0, "currency": "USD", "status": "paid", "customerId": "CUST-1002"},
                {"invoiceId": "inv_03", "amountDue": 49.0, "currency": "USD", "status": "past_due", "customerId": "CUST-1003"},
            ]
        },
    },
    {
        "key": "iot_devices",
        "name": "IoT devices — fleet",
        "category": "IoT",
        "description": "Online/offline sensors with last-seen timestamps.",
        "tags": ["iot", "devices"],
        "data": {
            "records": [
                {"deviceId": "dev_01", "name": "Sensor A1", "status": "ONLINE", "batteryPct": 91, "location": "Warehouse 1"},
                {"deviceId": "dev_02", "name": "Sensor B4", "status": "OFFLINE", "batteryPct": 12, "location": "Dock 3"},
                {"deviceId": "dev_03", "name": "Gateway G1", "status": "ONLINE", "batteryPct": 100, "location": "Roof"},
            ]
        },
    },
    {
        "key": "iot_telemetry",
        "name": "IoT telemetry — readings",
        "category": "IoT",
        "description": "Temperature / humidity samples for charting.",
        "tags": ["iot", "telemetry"],
        "data": {
            "records": [
                {"deviceId": "dev_01", "temperatureC": 22.4, "humidity": 48, "recordedAt": "2026-08-04T10:00:00Z"},
                {"deviceId": "dev_01", "temperatureC": 22.9, "humidity": 47, "recordedAt": "2026-08-04T10:05:00Z"},
                {"deviceId": "dev_02", "temperatureC": 31.2, "humidity": 55, "recordedAt": "2026-08-04T09:50:00Z"},
            ]
        },
    },
    {
        "key": "support_tickets",
        "name": "Support tickets — queue",
        "category": "Support",
        "description": "Open / pending / resolved tickets.",
        "tags": ["support", "tickets"],
        "data": {
            "records": [
                {"ticketId": "tkt_01", "subject": "Cannot reset password", "status": "OPEN", "priority": "HIGH", "assignee": "agent_1"},
                {"ticketId": "tkt_02", "subject": "Invoice missing", "status": "PENDING", "priority": "MEDIUM", "assignee": "agent_2"},
                {"ticketId": "tkt_03", "subject": "Feature request", "status": "RESOLVED", "priority": "LOW", "assignee": "agent_1"},
            ]
        },
    },
    {
        "key": "notifications_inbox",
        "name": "Notifications — inbox",
        "category": "Notifications",
        "description": "Read/unread notification feed.",
        "tags": ["notifications"],
        "data": {
            "records": [
                {"id": "ntf_01", "title": "Payment received", "read": False, "channel": "email"},
                {"id": "ntf_02", "title": "Security alert", "read": False, "channel": "push"},
                {"id": "ntf_03", "title": "Weekly digest", "read": True, "channel": "email"},
            ]
        },
    },
    {
        "key": "properties",
        "name": "Properties — listings",
        "category": "Real Estate",
        "description": "For-sale property cards.",
        "tags": ["real-estate", "listings"],
        "data": {
            "records": [
                {"id": "prop_01", "address": "120 Market St, San Francisco", "price": 725000, "beds": 3, "baths": 2, "status": "FOR_SALE"},
                {"id": "prop_02", "address": "88 Pier Ave, Oakland", "price": 540000, "beds": 2, "baths": 1, "status": "PENDING"},
                {"id": "prop_03", "address": "14 Cedar Ln, Berkeley", "price": 910000, "beds": 4, "baths": 3, "status": "FOR_SALE"},
            ]
        },
    },
    {
        "key": "users_rbac",
        "name": "Users — roles sample",
        "category": "Auth",
        "description": "Admin / member / viewer users for RBAC mocks.",
        "tags": ["auth", "users", "rbac"],
        "data": {
            "records": [
                {"id": "usr_01", "email": "admin@acme.test", "name": "Admin User", "role": "admin"},
                {"id": "usr_02", "email": "editor@acme.test", "name": "Editor User", "role": "member"},
                {"id": "usr_03", "email": "viewer@acme.test", "name": "Viewer User", "role": "viewer"},
            ]
        },
    },
    {
        "key": "credit_scores",
        "name": "Credit scores — bureau sample",
        "category": "Credit",
        "description": "Score bands for eligibility rule testing.",
        "tags": ["credit", "bureau"],
        "data": {
            "records": [
                {"customerId": "CUST-1001", "score": 780, "band": "EXCELLENT", "bureau": "Experian"},
                {"customerId": "CUST-1002", "score": 690, "band": "GOOD", "bureau": "Equifax"},
                {"customerId": "CUST-9001", "score": 520, "band": "POOR", "bureau": "TransUnion"},
            ]
        },
    },
    {
        "key": "merchants",
        "name": "Merchants — onboarded",
        "category": "Merchant",
        "description": "Merchant accounts for acquirer sandboxes.",
        "tags": ["merchant", "payments"],
        "data": {
            "records": [
                {"merchantId": "mrc_01", "legalName": "Aurora Goods LLC", "mcc": "5999", "status": "ACTIVE", "country": "US"},
                {"merchantId": "mrc_02", "legalName": "Nimbus Labs Pvt", "mcc": "5734", "status": "PENDING", "country": "NP"},
                {"merchantId": "mrc_03", "legalName": "Orbit Retail", "mcc": "5311", "status": "SUSPENDED", "country": "GB"},
            ]
        },
    },
    {
        "key": "corporate_entities",
        "name": "Corporate entities — registry",
        "category": "Government",
        "description": "Company registry rows for KYB lookups.",
        "tags": ["government", "kyb", "registry"],
        "data": {
            "records": [
                {"regNumber": "REG-100221", "legalName": "Acme Holdings", "type": "CORPORATE", "status": "ACTIVE", "jurisdiction": "DE"},
                {"regNumber": "REG-882190", "legalName": "Helix Ventures Ltd", "type": "CORPORATE", "status": "ACTIVE", "jurisdiction": "GB"},
                {"regNumber": "REG-000001", "legalName": "Shell Nominee", "type": "CORPORATE", "status": "DISSOLVED", "jurisdiction": "CY"},
            ]
        },
    },
]


def list_dataset_catalog(q: str = "", category: str = "") -> list:
    needle = (q or "").strip().lower()
    cat = (category or "").strip().lower()
    items = []
    for row in DATASET_CATALOG:
        if cat and row.get("category", "").lower() != cat:
            continue
        hay = " ".join(
            [
                row.get("key", ""),
                row.get("name", ""),
                row.get("description", ""),
                row.get("category", ""),
                " ".join(row.get("tags") or []),
            ]
        ).lower()
        if needle and needle not in hay:
            continue
        records = (row.get("data") or {}).get("records") or []
        items.append(
            {
                "key": row["key"],
                "name": row["name"],
                "category": row.get("category", ""),
                "description": row.get("description", ""),
                "tags": row.get("tags") or [],
                "record_count": len(records) if isinstance(records, list) else 1,
                "preview": records[:2] if isinstance(records, list) else row.get("data"),
            }
        )
    items.sort(key=lambda x: (x["category"], x["name"]))
    return items


def get_catalog_dataset(key: str) -> dict | None:
    for row in DATASET_CATALOG:
        if row["key"] == key:
            return dict(row)
    return None


def catalog_categories() -> list[str]:
    return sorted({row.get("category", "") for row in DATASET_CATALOG if row.get("category")})
