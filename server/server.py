from bottle import route, run, static_file, get, post, request
import bottle, sqlite3


app = bottle.Bottle()
#plugin = bottle.ext.sqlite.Plugin(dbfile="user_settings.db")

conn = sqlite3.connect('user_settings.db')

@route('/login') # or @route('/login')
def login():
    return '''
        <form action="/login" method="post">
            Username: <input name="username" type="text" />
            Password: <input name="password" type="password" />
            <input value="Login" type="submit" />
        </form>
        '''

@post('/login') # or @route('/login', method='POST')
def do_login():
    username = request.forms.get('username')
    password = request.forms.get('password')
    if True:
        return "<p>Your login information was correct.</p>"
    else:
        return "<p>Login failed.</p>"

# @app.route("/<filepath:path>")
# def server_static(filepath):
#     return static_file(filepath, root='/home/ec2-user/stability')


# @app.route('/show/:item')
# def show(item, db):
#     row = db.execute('SELECT * from items where name=?', item).fetchone()
#     if row:
#         return template('showitem', page=row)
#     return HTTPError(404, "Page not found")

run(app, port=80, host='0.0.0.0', debug=True)
