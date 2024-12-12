CREATE TABLE persons (
    person_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    country_id INT NOT NULL REFERENCES countries(country_id) ON DELETE RESTRICT,
    photo_url TEXT
)