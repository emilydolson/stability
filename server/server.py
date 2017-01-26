from bottle import Bottle, route, run, static_file

app = Bottle()


@app.route("/<filepath:path>")
def server_static(filepath):
    return static_file(filepath, root='~/stability')

run(app, port=80, host='0.0.0.0')
