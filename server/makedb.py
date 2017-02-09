import sqlite3

db_file = 'user_settings.db'

conn = sqlite3.connect(db_file)
c = conn.cursor()

c.execute("CREATE TABLE settings (userid STRING PRIMARY KEY)")
c.execute("ALTER TABLE settings ADD COLUMN 'graph_settings' STRING")
c.execute("ALTER TABLE settings ADD COLUMN 'safe_mode' STRING")

conn.commit()
conn.close()
