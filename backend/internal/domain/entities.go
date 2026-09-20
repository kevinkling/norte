package domain

var EntityTables = map[string]string{
	"category":       "categories",
	"item":           "items",
	"purchase":       "purchases",
	"task":           "tasks",
	"inspiration":    "inspirations",
	"monthly_budget": "monthly_budgets",
	"attachment":     "attachments",
	"tag":            "tags",
	"item_tag":       "item_tags",
}

var EntityColumns = map[string][]string{
	"category": {
		"id", "area", "name", "parent_id", "position",
		"created_at", "updated_at", "deleted_at", "revision",
	},
	"item": {
		"id", "area", "name", "category_id", "description", "estimated_cost_minor",
		"currency", "priority", "target_month", "status", "reference_url",
		"order_scope", "position", "created_at", "updated_at", "deleted_at", "revision",
	},
	"purchase": {
		"id", "item_id", "purchased_on", "paid_amount_minor", "currency", "notes",
		"created_at", "updated_at", "deleted_at", "revision",
	},
	"task": {
		"id", "area", "title", "notes", "due_on", "recurrence_rule", "recurrence_root_id",
		"status", "completed_at", "order_scope", "position",
		"created_at", "updated_at", "deleted_at", "revision",
	},
	"inspiration": {
		"id", "area", "item_id", "category_id", "title", "notes", "external_url",
		"order_scope", "position", "created_at", "updated_at", "deleted_at", "revision",
	},
	"tag": {
		"id", "area", "name", "position",
		"created_at", "updated_at", "deleted_at", "revision",
	},
	"item_tag": {
		"id", "item_id", "tag_id",
		"created_at", "updated_at", "deleted_at", "revision",
	},
	"monthly_budget": {
		"id", "period", "available_minor", "currency", "notes",
		"created_at", "updated_at", "deleted_at", "revision",
	},
	"attachment": {
		"id", "item_id", "purchase_id", "inspiration_id", "role", "position",
		"filename", "mime_type", "byte_size", "sha256", "content_state",
		"created_at", "updated_at", "deleted_at", "revision",
	},
}

func IsKnown(entityType string) bool {
	_, ok := EntityTables[entityType]
	return ok
}
