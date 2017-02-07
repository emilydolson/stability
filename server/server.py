from bottle import route, run, static_file, get, post, request, response
import bottle
import sqlite3


app = bottle.Bottle()
# plugin = bottle.ext.sqlite.Plugin(dbfile="user_settings.db")

conn = sqlite3.connect('user_settings.db')
c = conn.cursor()

# @app.route('/update_settings') # or @route('/login')
# def login():
#     return '''
#         <form action="/login" method="post">
#             Username: <input name="username" type="text" />
#             Password: <input name="password" type="password" />
#             <input value="Login" type="submit" />
#         </form>
#         '''


@app.post('/update_settings')  # or @route('/login', method='POST')
def update_settings():
    # response.content_type = 'application/json'
    # username = response["user"]
    # value = response["value"]
    username = request.json["user"]
    value = request.json["value"]
    c.execute("SELECT COUNT(*) FROM settings WHERE userid=\'{user}\'"
              .format(user=username))
    count = c.fetchall()
    if count[0][0]:  #user is in db
        c.execute("UPDATE settings SET graph_settings=\'{val}\' WHERE userid=\'{user}\'"
              .format(val=value, user=username))
    else:
        c.execute("INSERT INTO settings values (\'{user}\', \'{val}\')"
                  .format(user=username, val=value))
    conn.commit()
    print "Hello " + str(username) + " value is " + str(value)
    return "Hello " + str(username) + " value is " + str(value)


@app.route("/<filepath:path>")
def server_static(filepath):
    return static_file(filepath, root='/home/ec2-user/stability')


# @app.route('/show/:item')
# def show(item, db):
#     row = db.execute('SELECT * from items where name=?', item).fetchone()
#     if row:
#         return template('showitem', page=row)
#     return HTTPError(404, "Page not found")

# server = CherryPyWSGIServer(
#     ('0.0.0.0', 80),
#     app,
#     server_name='stability',
#     numthreads=30)

run(app, server="tornado", port=80, host='0.0.0.0', debug=True, reloader=True)
# try:
#     server.start()
# except KeyboardInterrupt:
#     server.stop()
