const deleteAuthorById = `
     DELETE FROM authors
     WHERE id = UNHEX(?)
 `;