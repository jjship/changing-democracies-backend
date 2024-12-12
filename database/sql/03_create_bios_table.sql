CREATE TABLE bios (
    bio_id SERIAL PRIMARY KEY,
    person_id INT NOT NULL REFERENCES persons(person_id) ON DELETE CASCADE,
    language_code VARCHAR(2) NOT NULL,
    bio TEXT NOT NULL,
    UNIQUE (person_id, language_code)
)
