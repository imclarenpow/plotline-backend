-- create the weight lookup table for categories.
INSERT INTO subject_categories (name, weight)
VALUES ('metadata', 0.10),
    ('domain', 0.40),
    ('audience', 1.00),
    ('format', 0.30);