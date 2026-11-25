-- Buttons form a tree: a button with children is a group of subcategories.
CREATE TABLE buttons (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	color TEXT NOT NULL,
	reset_cycle TEXT NOT NULL,
	parent_id TEXT REFERENCES buttons (id) ON DELETE CASCADE,
	sort_order INTEGER NOT NULL DEFAULT 0,
	created_at INTEGER NOT NULL
);

CREATE INDEX idx_buttons_parent ON buttons (parent_id);

CREATE TABLE records (
	id TEXT PRIMARY KEY,
	button_id TEXT NOT NULL REFERENCES buttons (id) ON DELETE CASCADE,
	timestamp INTEGER NOT NULL
);

CREATE INDEX idx_records_button ON records (button_id);
CREATE INDEX idx_records_timestamp ON records (timestamp);
