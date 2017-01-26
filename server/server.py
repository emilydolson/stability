from bottle import Bottle, route, run, static_file

app = Bottle()


@app.route("/<filepath:path>")
def server_static(filepath):
    return static_file(filepath, root='/home/ec2-user/stability')

run(app, port=80, host='0.0.0.0', debug=True)
