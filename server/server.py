from bottle import route, run, static_file, get, post, request, response
from oauth2client import client, crypt
import bottle
import sqlite3

ID = "262605754785-dtkb6a01rr39bdf8v2o8hp1b9p77eb68.apps.googleusercontent.com"
app = bottle.Bottle()
# plugin = bottle.ext.sqlite.Plugin(dbfile="user_settings.db")

conn = sqlite3.connect('user_settings.db')
c = conn.cursor()


@app.post('/update_settings')  # or @route('/login', method='POST')
def update_settings():
    username = request.json["user"]
    value = request.json["value"]
    safe = request.json["safe"]

    try:
        idinfo = client.verify_id_token(username, ID)

        if idinfo['iss'] not in ['accounts.google.com',
                                 'https://accounts.google.com']:
            print "Wrong issuer"
            raise crypt.AppIdentityError("Wrong issuer.")

    except crypt.AppIdentityError:
        print "Invalid token"
        return

    userid = idinfo['sub']

    c.execute("SELECT COUNT(*) FROM settings WHERE userid=\'{user}\'"
              .format(user=userid))
    count = c.fetchall()
    if count[0][0]:  # user is in db
        c.execute(
            "UPDATE settings SET graph_settings=\'{vl}\',safe_mode=\'{safe}\' WHERE userid=\'{us}\'"
            .format(vl=value, us=userid, safe=safe))
    else:
        c.execute("INSERT INTO settings values (\'{ur}\',\'{val}\',\'{safe}\')"
                  .format(ur=userid, val=value, safe=safe))
    conn.commit()


@app.post('/get_settings')  # or @route('/login', method='POST')
def get_settings():
    username = request.json["user"]

    try:
        idinfo = client.verify_id_token(username, ID)

        if idinfo['iss'] not in ['accounts.google.com',
                                 'https://accounts.google.com']:
            print "Wrong issuer"
            raise crypt.AppIdentityError("Wrong issuer.")

    except crypt.AppIdentityError:
        print "Invalid token"
        return

    userid = idinfo['sub']

    c.execute("SELECT * FROM settings WHERE userid=\'{user}\'"
              .format(user=userid))
    return c.fetchall()[0][1]


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
