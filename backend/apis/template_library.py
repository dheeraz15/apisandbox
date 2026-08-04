"""Additional API templates across industries and endpoint types."""

EXTRA_TEMPLATES = {
    # --- E-commerce ---
    "products_list": {
        "name": "List Products",
        "description": "Paginated product catalog listing",
        "category": "E-commerce",
        "endpoint_type": "list",
        "method": "GET",
        "endpoint": "/products",
        "query_params": [
            {"name": "page", "type": "integer", "required": False, "default": "1"},
            {"name": "limit", "type": "integer", "required": False, "default": "20"},
            {"name": "q", "type": "string", "required": False},
            {"name": "category", "type": "string", "required": False},
        ],
        "responses": [
            {
                "status_code": 200,
                "body": {
                    "items": [
                        {
                            "id": "prod_01",
                            "sku": "SKU-1001",
                            "name": "{{faker.product}}",
                            "price": "{{randomFloat}}",
                            "currency": "USD",
                            "inStock": True,
                        },
                        {
                            "id": "prod_02",
                            "sku": "SKU-1002",
                            "name": "{{faker.product}}",
                            "price": "{{randomFloat}}",
                            "currency": "USD",
                            "inStock": False,
                        },
                    ],
                    "page": "{{request.query.page}}",
                    "total": 128,
                    "hasMore": True,
                },
            }
        ],
    },
    "product_detail": {
        "name": "Product Detail",
        "description": "Fetch a single product by ID",
        "category": "E-commerce",
        "endpoint_type": "detail",
        "method": "GET",
        "endpoint": "/products/{id}",
        "path_params": [{"name": "id", "type": "string", "required": True}],
        "responses": [
            {
                "status_code": 200,
                "body": {
                    "id": "{{request.path.id}}",
                    "sku": "SKU-1001",
                    "name": "{{faker.product}}",
                    "description": "{{faker.sentence}}",
                    "price": 49.99,
                    "currency": "USD",
                    "inventory": 42,
                    "images": ["https://cdn.example.com/p1.jpg"],
                },
            },
            {"status_code": 404, "body": {"error": "PRODUCT_NOT_FOUND"}},
        ],
    },
    "order_create": {
        "name": "Create Order",
        "description": "Place a new commerce order",
        "category": "E-commerce",
        "endpoint_type": "create",
        "method": "POST",
        "endpoint": "/orders",
        "body_example": {
            "customerId": "cust_01",
            "items": [{"sku": "SKU-1001", "qty": 2}],
            "shippingAddress": {"line1": "1 Market St", "city": "SF", "country": "US"},
        },
        "responses": [
            {
                "status_code": 201,
                "body": {
                    "orderId": "{{uuid}}",
                    "status": "PENDING",
                    "total": 99.98,
                    "currency": "USD",
                    "createdAt": "{{timestamp}}",
                },
            }
        ],
    },
    "cart_update": {
        "name": "Update Cart Item",
        "description": "Update quantity for a cart line item",
        "category": "E-commerce",
        "endpoint_type": "update",
        "method": "PATCH",
        "endpoint": "/carts/{cartId}/items/{itemId}",
        "path_params": [
            {"name": "cartId", "type": "string", "required": True},
            {"name": "itemId", "type": "string", "required": True},
        ],
        "body_example": {"qty": 3},
        "responses": [
            {
                "status_code": 200,
                "body": {
                    "cartId": "{{request.path.cartId}}",
                    "itemId": "{{request.path.itemId}}",
                    "qty": "{{request.body.qty}}",
                    "updatedAt": "{{timestamp}}",
                },
            }
        ],
    },
    "order_cancel": {
        "name": "Cancel Order",
        "description": "Cancel an existing order",
        "category": "E-commerce",
        "endpoint_type": "delete",
        "method": "DELETE",
        "endpoint": "/orders/{id}",
        "path_params": [{"name": "id", "type": "string", "required": True}],
        "responses": [
            {
                "status_code": 200,
                "body": {
                    "orderId": "{{request.path.id}}",
                    "status": "CANCELLED",
                    "cancelledAt": "{{timestamp}}",
                },
            }
        ],
    },
    # --- Auth / Identity ---
    "auth_login": {
        "name": "Login",
        "description": "Exchange credentials for access tokens",
        "category": "Auth",
        "endpoint_type": "action",
        "method": "POST",
        "endpoint": "/auth/login",
        "body_example": {"email": "user@example.com", "password": "••••••••"},
        "responses": [
            {
                "status_code": 200,
                "body": {
                    "accessToken": "{{uuid}}",
                    "refreshToken": "{{uuid}}",
                    "expiresIn": 3600,
                    "tokenType": "Bearer",
                    "user": {"id": "usr_01", "email": "{{request.body.email}}"},
                },
            },
            {
                "status_code": 401,
                "body": {"error": "INVALID_CREDENTIALS"},
            },
        ],
        "auth_type": "none",
    },
    "auth_me": {
        "name": "Current User",
        "description": "Return the authenticated user profile",
        "category": "Auth",
        "endpoint_type": "detail",
        "method": "GET",
        "endpoint": "/auth/me",
        "auth_type": "bearer",
        "responses": [
            {
                "status_code": 200,
                "body": {
                    "id": "usr_01",
                    "email": "{{faker.email}}",
                    "name": "{{faker.name}}",
                    "roles": ["member"],
                },
            }
        ],
    },
    "users_list": {
        "name": "List Users",
        "description": "Workspace user directory listing",
        "category": "Auth",
        "endpoint_type": "list",
        "method": "GET",
        "endpoint": "/users",
        "query_params": [
            {"name": "page", "type": "integer", "required": False},
            {"name": "role", "type": "string", "required": False},
        ],
        "responses": [
            {
                "status_code": 200,
                "body": {
                    "items": [
                        {"id": "usr_01", "email": "{{faker.email}}", "name": "{{faker.name}}", "role": "admin"},
                        {"id": "usr_02", "email": "{{faker.email}}", "name": "{{faker.name}}", "role": "member"},
                    ],
                    "total": 2,
                },
            }
        ],
    },
    # --- Healthcare ---
    "patients_list": {
        "name": "List Patients",
        "description": "Searchable patient roster",
        "category": "Healthcare",
        "endpoint_type": "list",
        "method": "GET",
        "endpoint": "/patients",
        "query_params": [
            {"name": "q", "type": "string", "required": False},
            {"name": "status", "type": "string", "required": False},
        ],
        "responses": [
            {
                "status_code": 200,
                "body": {
                    "items": [
                        {
                            "patientId": "pat_01",
                            "name": "{{faker.name}}",
                            "dob": "1988-04-12",
                            "status": "ACTIVE",
                        }
                    ],
                    "total": 1,
                },
            }
        ],
    },
    "patient_detail": {
        "name": "Patient Detail",
        "description": "Fetch patient demographics by ID",
        "category": "Healthcare",
        "endpoint_type": "detail",
        "method": "GET",
        "endpoint": "/patients/{id}",
        "path_params": [{"name": "id", "type": "string", "required": True}],
        "responses": [
            {
                "status_code": 200,
                "body": {
                    "patientId": "{{request.path.id}}",
                    "name": "{{faker.name}}",
                    "dob": "1988-04-12",
                    "gender": "F",
                    "mrn": "MRN-88421",
                    "phone": "{{faker.phone}}",
                    "allergies": ["Penicillin"],
                },
            }
        ],
    },
    "appointment_create": {
        "name": "Book Appointment",
        "description": "Create a clinical appointment",
        "category": "Healthcare",
        "endpoint_type": "create",
        "method": "POST",
        "endpoint": "/appointments",
        "body_example": {
            "patientId": "pat_01",
            "providerId": "prv_09",
            "startsAt": "2026-08-10T14:00:00Z",
            "reason": "Follow-up",
        },
        "responses": [
            {
                "status_code": 201,
                "body": {
                    "appointmentId": "{{uuid}}",
                    "status": "SCHEDULED",
                    "startsAt": "{{request.body.startsAt}}",
                },
            }
        ],
    },
    # --- Logistics ---
    "shipments_list": {
        "name": "List Shipments",
        "description": "Shipment board with status filters",
        "category": "Logistics",
        "endpoint_type": "list",
        "method": "GET",
        "endpoint": "/shipments",
        "query_params": [
            {"name": "status", "type": "string", "required": False},
            {"name": "carrier", "type": "string", "required": False},
        ],
        "responses": [
            {
                "status_code": 200,
                "body": {
                    "items": [
                        {
                            "shipmentId": "shp_01",
                            "trackingNumber": "1Z999AA10123456784",
                            "status": "IN_TRANSIT",
                            "carrier": "UPS",
                        }
                    ],
                    "total": 1,
                },
            }
        ],
    },
    "shipment_track": {
        "name": "Track Shipment",
        "description": "Tracking detail for a shipment",
        "category": "Logistics",
        "endpoint_type": "detail",
        "method": "GET",
        "endpoint": "/shipments/{id}/track",
        "path_params": [{"name": "id", "type": "string", "required": True}],
        "responses": [
            {
                "status_code": 200,
                "body": {
                    "shipmentId": "{{request.path.id}}",
                    "status": "IN_TRANSIT",
                    "eta": "2026-08-08T18:00:00Z",
                    "events": [
                        {"at": "2026-08-05T09:00:00Z", "code": "PICKED_UP", "city": "Oakland"},
                        {"at": "2026-08-06T11:20:00Z", "code": "DEPARTED", "city": "Reno"},
                    ],
                },
            }
        ],
    },
    # --- SaaS / Billing ---
    "subscriptions_list": {
        "name": "List Subscriptions",
        "description": "Customer subscription listing",
        "category": "SaaS",
        "endpoint_type": "list",
        "method": "GET",
        "endpoint": "/subscriptions",
        "responses": [
            {
                "status_code": 200,
                "body": {
                    "items": [
                        {
                            "id": "sub_01",
                            "plan": "pro",
                            "status": "active",
                            "mrr": 49,
                            "renewsAt": "2026-09-01T00:00:00Z",
                        }
                    ]
                },
            }
        ],
    },
    "invoice_detail": {
        "name": "Invoice Detail",
        "description": "Fetch invoice by ID",
        "category": "SaaS",
        "endpoint_type": "detail",
        "method": "GET",
        "endpoint": "/invoices/{id}",
        "path_params": [{"name": "id", "type": "string", "required": True}],
        "responses": [
            {
                "status_code": 200,
                "body": {
                    "invoiceId": "{{request.path.id}}",
                    "amountDue": 149.0,
                    "currency": "USD",
                    "status": "open",
                    "lineItems": [{"description": "Pro plan", "amount": 149.0}],
                },
            }
        ],
    },
    "subscription_update": {
        "name": "Update Subscription",
        "description": "Change plan or seat count",
        "category": "SaaS",
        "endpoint_type": "update",
        "method": "PATCH",
        "endpoint": "/subscriptions/{id}",
        "path_params": [{"name": "id", "type": "string", "required": True}],
        "body_example": {"plan": "enterprise", "seats": 25},
        "responses": [
            {
                "status_code": 200,
                "body": {
                    "id": "{{request.path.id}}",
                    "plan": "{{request.body.plan}}",
                    "seats": "{{request.body.seats}}",
                    "updatedAt": "{{timestamp}}",
                },
            }
        ],
    },
    # --- HR ---
    "employees_list": {
        "name": "List Employees",
        "description": "HR employee directory",
        "category": "HR",
        "endpoint_type": "list",
        "method": "GET",
        "endpoint": "/employees",
        "query_params": [
            {"name": "department", "type": "string", "required": False},
            {"name": "status", "type": "string", "required": False},
        ],
        "responses": [
            {
                "status_code": 200,
                "body": {
                    "items": [
                        {
                            "employeeId": "emp_01",
                            "name": "{{faker.name}}",
                            "title": "Engineer",
                            "department": "Platform",
                            "status": "ACTIVE",
                        }
                    ],
                    "total": 1,
                },
            }
        ],
    },
    "employee_detail": {
        "name": "Employee Detail",
        "description": "Fetch employee profile",
        "category": "HR",
        "endpoint_type": "detail",
        "method": "GET",
        "endpoint": "/employees/{id}",
        "path_params": [{"name": "id", "type": "string", "required": True}],
        "responses": [
            {
                "status_code": 200,
                "body": {
                    "employeeId": "{{request.path.id}}",
                    "name": "{{faker.name}}",
                    "email": "{{faker.email}}",
                    "title": "Senior Engineer",
                    "department": "Platform",
                    "startDate": "2022-03-01",
                    "managerId": "emp_00",
                },
            }
        ],
    },
    "timeoff_create": {
        "name": "Request Time Off",
        "description": "Submit a PTO request",
        "category": "HR",
        "endpoint_type": "create",
        "method": "POST",
        "endpoint": "/time-off",
        "body_example": {
            "employeeId": "emp_01",
            "from": "2026-08-20",
            "to": "2026-08-22",
            "type": "VACATION",
        },
        "responses": [
            {
                "status_code": 201,
                "body": {
                    "requestId": "{{uuid}}",
                    "status": "PENDING",
                    "createdAt": "{{timestamp}}",
                },
            }
        ],
    },
    # --- IoT ---
    "devices_list": {
        "name": "List Devices",
        "description": "IoT device inventory",
        "category": "IoT",
        "endpoint_type": "list",
        "method": "GET",
        "endpoint": "/devices",
        "responses": [
            {
                "status_code": 200,
                "body": {
                    "items": [
                        {
                            "deviceId": "dev_01",
                            "name": "Sensor A1",
                            "status": "ONLINE",
                            "lastSeenAt": "{{timestamp}}",
                        }
                    ]
                },
            }
        ],
    },
    "device_telemetry": {
        "name": "Device Telemetry",
        "description": "Latest readings for a device",
        "category": "IoT",
        "endpoint_type": "detail",
        "method": "GET",
        "endpoint": "/devices/{id}/telemetry",
        "path_params": [{"name": "id", "type": "string", "required": True}],
        "responses": [
            {
                "status_code": 200,
                "body": {
                    "deviceId": "{{request.path.id}}",
                    "temperatureC": 22.4,
                    "humidity": 48,
                    "batteryPct": 91,
                    "recordedAt": "{{timestamp}}",
                },
            }
        ],
    },
    # --- Notifications ---
    "notifications_list": {
        "name": "List Notifications",
        "description": "Inbox of user notifications",
        "category": "Notifications",
        "endpoint_type": "list",
        "method": "GET",
        "endpoint": "/notifications",
        "responses": [
            {
                "status_code": 200,
                "body": {
                    "items": [
                        {
                            "id": "ntf_01",
                            "title": "Payment received",
                            "read": False,
                            "createdAt": "{{timestamp}}",
                        }
                    ],
                    "unread": 1,
                },
            }
        ],
    },
    "notification_send": {
        "name": "Send Notification",
        "description": "Dispatch a push/email/SMS notification",
        "category": "Notifications",
        "endpoint_type": "action",
        "method": "POST",
        "endpoint": "/notifications/send",
        "body_example": {
            "channel": "email",
            "to": "user@example.com",
            "template": "welcome",
            "data": {"name": "Ada"},
        },
        "responses": [
            {
                "status_code": 202,
                "body": {
                    "messageId": "{{uuid}}",
                    "status": "QUEUED",
                    "channel": "{{request.body.channel}}",
                },
            }
        ],
    },
    # --- Banking expansions (list/detail) ---
    "accounts_list": {
        "name": "List Accounts",
        "description": "Customer bank accounts listing",
        "category": "Core Banking",
        "endpoint_type": "list",
        "method": "GET",
        "endpoint": "/accounts",
        "query_params": [
            {"name": "customerId", "type": "string", "required": False},
            {"name": "status", "type": "string", "required": False},
        ],
        "responses": [
            {
                "status_code": 200,
                "body": {
                    "items": [
                        {
                            "accountNumber": "1001234567",
                            "type": "CHECKING",
                            "currency": "USD",
                            "availableBalance": 4521.33,
                            "status": "ACTIVE",
                        },
                        {
                            "accountNumber": "1001234999",
                            "type": "SAVINGS",
                            "currency": "USD",
                            "availableBalance": 12000.0,
                            "status": "ACTIVE",
                        },
                    ],
                    "total": 2,
                },
            }
        ],
    },
    "account_detail": {
        "name": "Account Detail",
        "description": "Fetch a single account by number",
        "category": "Core Banking",
        "endpoint_type": "detail",
        "method": "GET",
        "endpoint": "/accounts/{accountNumber}",
        "path_params": [{"name": "accountNumber", "type": "string", "required": True}],
        "responses": [
            {
                "status_code": 200,
                "body": {
                    "accountNumber": "{{request.path.accountNumber}}",
                    "type": "CHECKING",
                    "currency": "USD",
                    "availableBalance": 4521.33,
                    "ledgerBalance": 4600.0,
                    "status": "ACTIVE",
                    "openedAt": "2019-06-12",
                },
            }
        ],
    },
    "transactions_list": {
        "name": "List Transactions",
        "description": "Account transaction history",
        "category": "Core Banking",
        "endpoint_type": "list",
        "method": "GET",
        "endpoint": "/accounts/{accountNumber}/transactions",
        "path_params": [{"name": "accountNumber", "type": "string", "required": True}],
        "query_params": [
            {"name": "from", "type": "string", "required": False},
            {"name": "to", "type": "string", "required": False},
            {"name": "limit", "type": "integer", "required": False},
        ],
        "responses": [
            {
                "status_code": 200,
                "body": {
                    "accountNumber": "{{request.path.accountNumber}}",
                    "items": [
                        {
                            "id": "txn_01",
                            "amount": -42.5,
                            "currency": "USD",
                            "description": "POS Purchase",
                            "postedAt": "2026-08-01T16:22:00Z",
                        },
                        {
                            "id": "txn_02",
                            "amount": 1500.0,
                            "currency": "USD",
                            "description": "Payroll",
                            "postedAt": "2026-07-31T08:00:00Z",
                        },
                    ],
                },
            }
        ],
    },
    # --- Payments ---
    "refund_create": {
        "name": "Create Refund",
        "description": "Refund a settled payment",
        "category": "Payments",
        "endpoint_type": "create",
        "method": "POST",
        "endpoint": "/refunds",
        "body_example": {"paymentId": "pay_8f2a", "amount": 25.0, "reason": "requested_by_customer"},
        "responses": [
            {
                "status_code": 201,
                "body": {
                    "refundId": "{{uuid}}",
                    "paymentId": "{{request.body.paymentId}}",
                    "amount": "{{request.body.amount}}",
                    "status": "succeeded",
                },
            }
        ],
    },
    "payment_detail": {
        "name": "Payment Detail",
        "description": "Fetch payment by ID",
        "category": "Payments",
        "endpoint_type": "detail",
        "method": "GET",
        "endpoint": "/payments/{id}",
        "path_params": [{"name": "id", "type": "string", "required": True}],
        "responses": [
            {
                "status_code": 200,
                "body": {
                    "paymentId": "{{request.path.id}}",
                    "amount": 120.0,
                    "currency": "USD",
                    "status": "authorized",
                    "createdAt": "{{timestamp}}",
                },
            }
        ],
    },
    # --- Content / CMS ---
    "articles_list": {
        "name": "List Articles",
        "description": "CMS article listing",
        "category": "Content",
        "endpoint_type": "list",
        "method": "GET",
        "endpoint": "/articles",
        "query_params": [
            {"name": "tag", "type": "string", "required": False},
            {"name": "page", "type": "integer", "required": False},
        ],
        "responses": [
            {
                "status_code": 200,
                "body": {
                    "items": [
                        {
                            "slug": "getting-started",
                            "title": "Getting started",
                            "publishedAt": "2026-07-01T00:00:00Z",
                        }
                    ]
                },
            }
        ],
    },
    "article_detail": {
        "name": "Article Detail",
        "description": "Fetch article by slug",
        "category": "Content",
        "endpoint_type": "detail",
        "method": "GET",
        "endpoint": "/articles/{slug}",
        "path_params": [{"name": "slug", "type": "string", "required": True}],
        "responses": [
            {
                "status_code": 200,
                "body": {
                    "slug": "{{request.path.slug}}",
                    "title": "Getting started",
                    "body": "{{faker.paragraph}}",
                    "author": "{{faker.name}}",
                    "publishedAt": "2026-07-01T00:00:00Z",
                },
            }
        ],
    },
    # --- Support ---
    "tickets_list": {
        "name": "List Support Tickets",
        "description": "Support ticket queue",
        "category": "Support",
        "endpoint_type": "list",
        "method": "GET",
        "endpoint": "/tickets",
        "query_params": [
            {"name": "status", "type": "string", "required": False},
            {"name": "priority", "type": "string", "required": False},
        ],
        "responses": [
            {
                "status_code": 200,
                "body": {
                    "items": [
                        {
                            "ticketId": "tkt_01",
                            "subject": "Cannot reset password",
                            "status": "OPEN",
                            "priority": "HIGH",
                        }
                    ]
                },
            }
        ],
    },
    "ticket_create": {
        "name": "Create Support Ticket",
        "description": "Open a new support ticket",
        "category": "Support",
        "endpoint_type": "create",
        "method": "POST",
        "endpoint": "/tickets",
        "body_example": {
            "subject": "Billing question",
            "body": "Need invoice for July",
            "priority": "MEDIUM",
        },
        "responses": [
            {
                "status_code": 201,
                "body": {
                    "ticketId": "{{uuid}}",
                    "status": "OPEN",
                    "createdAt": "{{timestamp}}",
                },
            }
        ],
    },
    # --- Real estate ---
    "properties_list": {
        "name": "List Properties",
        "description": "Property search listing",
        "category": "Real Estate",
        "endpoint_type": "list",
        "method": "GET",
        "endpoint": "/properties",
        "query_params": [
            {"name": "city", "type": "string", "required": False},
            {"name": "minPrice", "type": "number", "required": False},
            {"name": "maxPrice", "type": "number", "required": False},
        ],
        "responses": [
            {
                "status_code": 200,
                "body": {
                    "items": [
                        {
                            "id": "prop_01",
                            "address": "{{faker.address}}",
                            "price": 725000,
                            "beds": 3,
                            "baths": 2,
                        }
                    ]
                },
            }
        ],
    },
    "property_detail": {
        "name": "Property Detail",
        "description": "Fetch property listing detail",
        "category": "Real Estate",
        "endpoint_type": "detail",
        "method": "GET",
        "endpoint": "/properties/{id}",
        "path_params": [{"name": "id", "type": "string", "required": True}],
        "responses": [
            {
                "status_code": 200,
                "body": {
                    "id": "{{request.path.id}}",
                    "address": "{{faker.address}}",
                    "price": 725000,
                    "beds": 3,
                    "baths": 2,
                    "sqft": 1680,
                    "status": "FOR_SALE",
                },
            }
        ],
    },
}

EXTRA_META = {
    "products_list": {"icon": "shopping-bag", "popular": True, "blurb": "Paginated product catalog"},
    "product_detail": {"icon": "package", "popular": True, "blurb": "Single product by ID"},
    "order_create": {"icon": "shopping-cart", "popular": True, "blurb": "Place an order"},
    "cart_update": {"icon": "pencil", "popular": False, "blurb": "Update cart line qty"},
    "order_cancel": {"icon": "x", "popular": False, "blurb": "Cancel an order"},
    "auth_login": {"icon": "key", "popular": True, "blurb": "Email/password → tokens"},
    "auth_me": {"icon": "user", "popular": False, "blurb": "Authenticated profile"},
    "users_list": {"icon": "users", "popular": False, "blurb": "User directory"},
    "patients_list": {"icon": "heart", "popular": True, "blurb": "Patient roster"},
    "patient_detail": {"icon": "heart-pulse", "popular": False, "blurb": "Patient by ID"},
    "appointment_create": {"icon": "calendar", "popular": False, "blurb": "Book appointment"},
    "shipments_list": {"icon": "truck", "popular": True, "blurb": "Shipment board"},
    "shipment_track": {"icon": "map-pin", "popular": True, "blurb": "Tracking timeline"},
    "subscriptions_list": {"icon": "repeat", "popular": False, "blurb": "Subscriptions"},
    "invoice_detail": {"icon": "file-text", "popular": False, "blurb": "Invoice by ID"},
    "subscription_update": {"icon": "sliders", "popular": False, "blurb": "Change plan/seats"},
    "employees_list": {"icon": "briefcase", "popular": False, "blurb": "Employee directory"},
    "employee_detail": {"icon": "id-card", "popular": False, "blurb": "Employee profile"},
    "timeoff_create": {"icon": "palm-tree", "popular": False, "blurb": "PTO request"},
    "devices_list": {"icon": "cpu", "popular": False, "blurb": "IoT inventory"},
    "device_telemetry": {"icon": "activity", "popular": False, "blurb": "Latest sensor readings"},
    "notifications_list": {"icon": "bell", "popular": False, "blurb": "Notification inbox"},
    "notification_send": {"icon": "send", "popular": True, "blurb": "Send email/SMS/push"},
    "accounts_list": {"icon": "building", "popular": True, "blurb": "Bank accounts listing"},
    "account_detail": {"icon": "wallet", "popular": True, "blurb": "Account by number"},
    "transactions_list": {"icon": "list", "popular": True, "blurb": "Transaction history"},
    "refund_create": {"icon": "rotate-ccw", "popular": False, "blurb": "Create a refund"},
    "payment_detail": {"icon": "banknote", "popular": False, "blurb": "Payment by ID"},
    "articles_list": {"icon": "newspaper", "popular": False, "blurb": "CMS articles"},
    "article_detail": {"icon": "book-open", "popular": False, "blurb": "Article by slug"},
    "tickets_list": {"icon": "life-buoy", "popular": False, "blurb": "Support queue"},
    "ticket_create": {"icon": "message-square", "popular": False, "blurb": "Open a ticket"},
    "properties_list": {"icon": "home", "popular": False, "blurb": "Property search"},
    "property_detail": {"icon": "building-2", "popular": False, "blurb": "Property detail"},
}

EXTRA_KEYWORDS = {
    "product": "products_list",
    "products": "products_list",
    "catalog": "products_list",
    "order": "order_create",
    "cart": "cart_update",
    "login": "auth_login",
    "auth": "auth_login",
    "patient": "patients_list",
    "appointment": "appointment_create",
    "shipment": "shipments_list",
    "tracking": "shipment_track",
    "subscription": "subscriptions_list",
    "invoice": "invoice_detail",
    "employee": "employees_list",
    "device": "devices_list",
    "telemetry": "device_telemetry",
    "notification": "notification_send",
    "accounts": "accounts_list",
    "transactions": "transactions_list",
    "refund": "refund_create",
    "ticket": "ticket_create",
    "property": "properties_list",
    "article": "articles_list",
}
