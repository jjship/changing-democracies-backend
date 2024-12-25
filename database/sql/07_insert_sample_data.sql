-- Insert sample data for countries
INSERT INTO countries (name)
VALUES ('LITHUANIA');

-- Insert sample data for persons
INSERT INTO persons (name, country_id, photo_url)
VALUES ('Jouzas Malickas', 1, 'https://vz-cac74041-8b3.b-cdn.net/23be7b7b-f356-4abd-b71b-602e546eb999/thumbnail.jpg');

-- Insert sample data for bios
INSERT INTO bios (person_id, language_code, bio)
VALUES (1, 'en','Juozas Malickas (52), is a Lithuanian history teacher. He uses his life story to bridge Lithuania''s past & present. Raised across Lithuania, he emigrated to the US for 20 years before returning to Lithuania in 2020. Juozas offers a firsthand perspective on Soviet vs. post-independence Lithuania, also highlighting the shift from a restricted small town to the dynamic Vilnius of today.');

-- Insert sample data for tags
INSERT INTO tags (name)
VALUES ('LITHUANIA'), ('JOUZAS MALICKAS');

-- Insert sample data for fragments
INSERT INTO fragments (
    fragment_id, title, length, person_id, player_url, thumbnail_url
) VALUES (
    '23be7b7b-f356-4abd-b71b-602e546eb999',
    'CD_LITHUANIA_Juozas Malickas_Quote 6.mp4',
    53,
    1, -- Person ID for Jouzas Malickas
    'https://iframe.mediadelivery.net/play/239326/23be7b7b-f356-4abd-b71b-602e546eb999?autoplay=false',
    'https://vz-cac74041-8b3.b-cdn.net/23be7b7b-f356-4abd-b71b-602e546eb999/thumbnail.jpg'
);

-- Associate fragment with tags
INSERT INTO fragment_tags (fragment_id, tag_id)
VALUES 
('23be7b7b-f356-4abd-b71b-602e546eb999', 1), -- Tag ID for "LITHUANIA"
('23be7b7b-f356-4abd-b71b-602e546eb999', 2); -- Tag ID for "JOUZAS MALICKAS"
