from bottle import route, run, static_file, get, post, request
import bottle, sqlite3


app = bottle.Bottle()
#plugin = bottle.ext.sqlite.Plugin(dbfile="user_settings.db")

conn = sqlite3.connect('user_settings.db')

@get('/login') # or @route('/login')
def login():
    return """
        <form action="/login" method="post">
            Username: <input name="username" type="text" />
            Password: <input name="password" type="password" />
            <input value="Login" type="submit" />
        </form>
        """

@app.route("/<filepath:path>")
def server_static(filepath):
    return static_file(filepath, root='/home/ec2-user/stability')


# @app.route('/show/:item')
# def show(item, db):
#     row = db.execute('SELECT * from items where name=?', item).fetchone()
#     if row:
#         return template('showitem', page=row)
#     return HTTPError(404, "Page not found")

run(app, port=80, host='0.0.0.0', debug=True)
