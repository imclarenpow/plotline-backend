SELECT title,
    bio,
    subtitle,
    number_of_pages,
    xp
FROM books
WHERE id = (
        SELECT books_id
        FROM books_ol
        WHERE work_id = 'OL20465177W'
    );