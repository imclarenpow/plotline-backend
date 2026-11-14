-- Look up a work by its OpenLibrary work ID
SELECT w.title,
    w.subtitle,
    w.description,
    f.name AS format,
    w.page_count,
    w.xp
FROM works w
    JOIN work_external_ids x ON x.work_id = w.id
    JOIN sources s ON s.id = x.source_id
    LEFT JOIN formats f ON f.id = w.format_id
WHERE s.name = 'openlibrary'
    AND x.external_id = 'OL20465177W';
