CREATE TABLE fragment_tags (
    fragment_id UUID NOT NULL REFERENCES fragments(fragment_id) ON DELETE CASCADE,
    tag_id INT NOT NULL REFERENCES tags(tag_id) ON DELETE CASCADE,
    PRIMARY KEY (fragment_id, tag_id)
)
