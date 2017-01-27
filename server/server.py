from bottle import route, run, static_file
import bottle

app = bottle.Bottle()
plugin = bottle.ext.sqlite.Plugin(dbfile="user_settings.db")


@app.route("/<filepath:path>")
def server_static(filepath):
    return static_file(filepath, root='/home/ec2-user/stability')


@app.route('/show/:item')
def show(item, db):
    row = db.execute('SELECT * from items where name=?', item).fetchone()
    if row:
        return template('showitem', page=row)
    return HTTPError(404, "Page not found")

run(app, port=80, host='0.0.0.0', debug=True)
