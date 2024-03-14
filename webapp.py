import json
import logging
import os

from dotenv import load_dotenv
from flask import Flask, request, render_template, send_from_directory, jsonify
from flask_socketio import SocketIO

from provider import llm

load_dotenv(override=True)

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = os.path.join(os.getcwd(), 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 限制文件大小为16MB
app.logger.setLevel(logging.DEBUG)

socketio = SocketIO(app)
pg = None

if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])


class Progress:
    def __init__(self, filename):
        self.id = filename

    def set_progress(self, progress, msg):
        app.logger.info(f"progress: {progress}, msg: {msg}")
        socketio.emit('progress', {'progress': progress, 'status': msg, 'id': self.id})

@app.route('/')
def index():
    return render_template('pdf_viewer.html', filename=None)


# 处理标注的数据（哪一个文件，哪一页的哪个要素key识别不好, 标注的值value是）
@app.route('/down', methods=['POST'])
def handle_icon_click():
    data = request.json
    filename = data['filename']
    page = int(data['page'])  # 从1开始
    key = data['key']
    val = data['value']
    clicked = data['clicked']

    return jsonify({'status': 'success'})


# 切换llm通道，方便平时测试
@app.route('/switch_channel', methods=['POST'])
def switch_channel():
    data = request.json

    # 如果channel是数字，说明是切换llm通道
    if data['channel'].isdigit():
        channel = int(data['channel'])
        values = tuple(item.value for item in llm.Channel)
        if channel not in values:
            return jsonify({'status': 'fail', 'msg': f'频道 {channel} 切换失败'})

        llm.switch_channel(channel)
        app.logger.info(f"切换到频道 {llm.Channel(channel)}")
        return jsonify({'status': 'success', 'msg': f'频道 {llm.Channel(channel)} 切换成功'})


@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        app.logger.debug("没有收到文件")
        return jsonify({'err': "没有收到文件"})

    file = request.files['file']
    if file.filename == '':
        return '没有选择文件'

    if file and allowed_file(file.filename):
        app.logger.debug(f"收到{file.filename}")
        # filename = secure_filename(file.filename)
        filename = file.filename
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        if not os.path.exists(os.path.dirname(file_path)):
            os.makedirs(os.path.dirname(file_path))
        file.save(file_path)

        global pg
        pg = Progress(os.path.basename(filename))
        pg.set_progress(50, "正在识别")

        socketio.start_background_task(process_file
                                       , os.path.join(app.config['UPLOAD_FOLDER'], filename))

        return jsonify({'filename': filename})
        # return render_template('pdf_viewer.html', filename=filename)


def process_file(doc_path):
    # import time
    # time.sleep(1)

    result = llm.identify_type(doc_path, os.path.basename(doc_path))
    info_data(result, 1)

    if pg:
        pg.set_progress(100, "done")


@app.route('/uploaded', methods=['GET'])
def uploaded_file():
    filename = request.args.get('filepath')
    print("uploaded_file: ", app.config['UPLOAD_FOLDER'], filename)
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


def allowed_file(filename):
    ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'pdf'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def info_data(data, page):
    json_data = json.loads(data)
    socketio.emit('data', {'data': json_data, 'page': page})


if __name__ == '__main__':
    socketio.run(app, allow_unsafe_werkzeug=True, host="0.0.0.0", port=8000)
