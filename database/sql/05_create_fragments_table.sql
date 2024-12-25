CREATE TABLE fragments (
    fragment_id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    length INTEGER NOT NULL CHECK (length >= 0),
    person_id INT NOT NULL REFERENCES persons(person_id),
    player_url TEXT NOT NULL,
    thumbnail_url TEXT NOT NULL
);
