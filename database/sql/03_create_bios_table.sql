CREATE TABLE bios (
    bio_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    person_id INT NOT NULL REFERENCES persons(person_id) ON DELETE CASCADE,
    language_code VARCHAR(2) NOT NULL,
    bio TEXT NOT NULL,
    UNIQUE (person_id, language_code)
);
