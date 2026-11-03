const Database = require("better-sqlite3");

const db = new Database("./dev.db", {
  readonly: true,
  fileMustExist: true,
});

try {
  const tables = db.prepare(`
    SELECT name, sql
    FROM sqlite_master
    WHERE type = 'table'
      AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();

  for (const table of tables) {
    console.log(`\n========== TABLE: ${table.name} ==========`);
    console.log("CREATE SQL:");
    console.log(table.sql);

    console.log("\nCOLUMNS:");
    console.table(
      db.prepare(`PRAGMA table_info("${table.name}")`).all()
    );

    console.log("\nINDEXES:");
    const indexes = db.prepare(
      `PRAGMA index_list("${table.name}")`
    ).all();

    console.table(indexes);

    for (const index of indexes) {
      console.log(`INDEX SQL: ${index.name}`);
      console.log(
        db.prepare(
          "SELECT sql FROM sqlite_master WHERE type = 'index' AND name = ?"
        ).get(index.name)
      );
    }

    console.log(
      "\nROW COUNT:",
      db.prepare(`SELECT COUNT(*) AS count FROM "${table.name}"`).get().count
    );
  }
} finally {
  db.close();
}
