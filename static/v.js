// 存储当前上传的文件名
var currentFilename = '';
// 存储选择的文件和处理状态的数组
var filesToUpload = [];

function addFiles(newFiles) {
  filesToUpload = []
  for (var i = 0; i < newFiles.length; i++) {
    filesToUpload.push({ file: newFiles[i], processed: 0 });
  }
}

// 获取当前时间的函数
function getCurrentTime() {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

// 打印带有时间戳的日志
function log(...args) {
  const timestamp = getCurrentTime();
  console.log(`[${timestamp}]`, ...args);
}

document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('single-upload-btn').focus();
  var hostname = window.location.hostname;
  var port = window.location.port;

  var socket = io.connect('http://' + hostname + ':' + port);

  socket.on('connect', function () {
    console.log('WebSocket connected!');
    socket.emit('start_data_transfer');  // 告知服务器开始数据传输
  });

  // 进度处理
  socket.on('progress', function (data) {
    log('Progress: ' + JSON.stringify(data));

    if (data.progress)
      document.getElementById('progressBar').style.width = data.progress + '%';

    if (data.status)
      document.getElementById('progress-status').textContent = data.status;

    // 当data.status包含‘done’时，隐藏进度条
    if (data.status.includes('done')) {
      log('Progress: done');
      document.getElementById('progress-container-wrapper').style.display = 'none';
      document.getElementById('progress-status').style.display = 'none';
      document.getElementById('second-upload-form').style.display = 'flex';
    }
  });

  socket.on('data', function (data) {
    if (!data.data) return
    log('Data received: ' + JSON.stringify(data.data));
    document.getElementById('table-container').style.display = 'block';
    createTable(data.data, data.page)
  });

  // 创建表格
  function createTable(data, page) {
    var container = document.getElementById('table-container');
    document.getElementById('table-container').style.display = 'block';

    // 创建一个新的表格
    var table = document.createElement('table');
    table.classList.add('data-table'); // 添加样式类

    // 遍历 JSON 对象
    for (var key in data) {
      log('key', key)
      if (data.hasOwnProperty(key)) {
        var value = data[key];
        log('value', value)

        // 创建表格行
        var row = table.insertRow(-1);
        var cellKey = row.insertCell(0);
        var cellValue = row.insertCell(1);
        var cellIcon = row.insertCell(2); // 新增图标列

        cellKey.innerHTML = key;

        cellValue.innerHTML = value;
        cellValue.setAttribute('contenteditable', false);
        cellValue.addEventListener('keydown', function (event) {
          if (event.key === 'Enter' && !event.shiftKey) {
            var newValue = this.innerText; // 获取新的值
            var iconElement = this.nextElementSibling.querySelector('svg'); // 获取下一个单元格的svg元素
            log('单元格内容已更新', iconElement)
            // 发送数据到后端
            sendIconClickDataToBackend(iconElement, newValue);
            this.contentEditable = false;
          }
          else if (event.key === 'Escape') {
            this.contentEditable = false;
            this.innerText = this.getAttribute('oldValue'); // 恢复旧值
          }
        });
        cellValue.addEventListener('paste', function (event) {
          event.preventDefault(); // 阻止默认粘贴行为,避免把格式也粘贴了
          var text = '';
          // 获取剪贴板中的文本
          if (event.clipboardData || event.originalEvent.clipboardData) {
            text = (event.clipboardData || event.originalEvent.clipboardData).getData('text/plain');
          } else if (window.clipboardData) {
            text = window.clipboardData.getData('Text');
          }
          // 将纯文本插入到单元格中
          document.execCommand('insertText', false, text);
        });
      }
    }

    // 创建表格标题
    const title = document.createElement('h3');
    title.textContent = `第 ${page} 页`;
    title.setAttribute('page', page);
    title.addEventListener('click', function () {
      getPageText(this);
    });

    container.appendChild(title);

    // 将表格添加到容器
    container.appendChild(table);
  }

  // 发送点击图标的数据到后台 
  function sendIconClickDataToBackend(iconElement, newValue) {
    // isClicked=0 表示未点击, 发送到后台已点击状态，并修改图标为已点击颜色;反之亦然
    isClicked = iconElement.classList.contains('icon-clicked')
    var page = iconElement.getAttribute('page');
    var key = iconElement.getAttribute('key');

    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/down', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify({ page: page, key: key, clicked: !isClicked, filename: currentFilename, value: newValue }));
    log('发送点击图标的数据到后台', { page: page, key: key, clicked: !isClicked, filename: currentFilename });

    xhr.onload = function () {
      if (xhr.status === 200) {
        var response = JSON.parse(xhr.responseText);
        if (response.status === 'success') {
          console.log('Down data sent to backend successfully');
          iconElement.classList.toggle('icon-clicked');
        } else {
          alert(response.msg);
        }
      } else {
        alert('无法发送data到后台');
      }
    };
  }

  // 获取后端返回的中间文本
  function getPageText(titleElement) {
    page = titleElement.getAttribute('page');
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/text', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify({ page: page, filename: currentFilename }));
    xhr.onload = function () {
      if (xhr.status === 200) {
        var response = JSON.parse(xhr.responseText);
        if (response.status === 'success') {
          var newWindow = window.open('', '_blank');
          newWindow.document.write('<html><head><title>数据展示</title><style>p { white-space: pre-wrap; }</style></head><body>');
          newWindow.document.write('<p>' + response.text + '</p>'); // 假设 responseData 是您通过 AJAX 获取的数据
          newWindow.document.write('</body></html>');
          newWindow.document.close();
        } else {
          alert(response.msg);
        }
      } else {
        alert('无法发送data到后台');
      }
    };
  }

  function upload_one_file(file) {
    var formData = new FormData();
    formData.append('file', file);
    log('开始上传文件', file);

    document.getElementById('second-upload-form').style.display = 'none';

    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/upload', true);
    xhr.onload = function () {
      if (xhr.status === 200) {
        console.log(xhr.responseText)

        var response = JSON.parse(xhr.responseText);
        var uploadedFileName = response.filename;
        currentFilename = uploadedFileName;
        log('文件上传成功', uploadedFileName);

        table = document.getElementById("table-container");
        table.innerHTML = ""
        document.getElementById('progress-container-wrapper').style.display = 'block';
        document.getElementById('progress-status').style.display = 'block';

        // 更新 embed 标签的 src 属性
        var pdfViewer = document.getElementById('pdf-viewer');

        // 判断uploadedFileName是否是pdf文件
        if (uploadedFileName.endsWith('.pdf')) {
          var embedTag = '<embed src="/uploaded?filepath=' + encodeURIComponent(uploadedFileName) + '" type="application/pdf" width="100%" height="100%" />';
        }
        else {
          var embedTag = `
          <div class="image-container">
              <img id="preview-image" src="/uploaded?filepath=`+ encodeURIComponent(uploadedFileName)  +`" alt="预览图片">
          </div>
          <div class="btn-img" style="text-align: center; margin-top: 30px;">
              <button onclick="zoomIn()" aria-label="放大" style="border: none; background-color: transparent; cursor: pointer;">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-zoom-in">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  <line x1="11" y1="8" x2="11" y2="14"></line>
                  <line x1="8" y1="11" x2="14" y2="11"></line>
              </svg></button>
              <button onclick="zoomOut()" aria-label="缩小" style="border: none; background-color: transparent; cursor: pointer;">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-zoom-out">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  <line x1="8" y1="11" x2="14" y2="11"></line>
              </svg></button>
              <button onclick="rotate()" aria-label="旋转" style="border: none; background-color: transparent; cursor: pointer;">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-rotate-cw">
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <path d="M20.49 15C19.35 18.65 15.95 21 12 21c-4.42 0-8-3.58-8-8s3.58-8 8-8c1.66 0 3.2 0.51 4.45 1.38"></path>
                </svg>
              </button>
          </div>
          `
        }
        pdfViewer.innerHTML = embedTag;

        document.getElementById('json-viewer').style.display = 'block';

        // 更新为已处理状态
        filesToUpload.find(f => f.file === file).processed = 1;
        var totalFiles = filesToUpload.length;
        var processedFiles = filesToUpload.filter(f => f.processed === 1).length;
        document.getElementById('next-upload-btn').textContent = `下一文件(${processedFiles}/${totalFiles})`;
        log('filesToUpload', filesToUpload);
      } else {
        log('文件上传失败');
      }
    };

    xhr.send(formData);
  }

  function upload_files(elem) {
    const files = Array.from(elem.files);
    const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png'];
    const filteredFiles = files.filter(file => {
        const fileExtension = file.name.split('.').pop().toLowerCase();
        return allowedExtensions.includes(fileExtension);
    });
    if (filteredFiles.length < 1) {
      alert("请选择pdf, jpg, jpeg或png文件");
      return
    }

    addFiles(filteredFiles);
    upload_one_file(filteredFiles[0]);
  }

  var isDragging = false;
  var leftPanel = document.getElementById('pdf-viewer');
  var rightPanel = document.getElementById('json-viewer');
  var gutter = document.getElementById('gutter');
  var container = document.getElementById('container');

  gutter.addEventListener('mousedown', function (e) {
    e.preventDefault();
    isDragging = true;
  });

  document.addEventListener('mousemove', function (e) {
    // Only resize if dragging is active
    if (!isDragging) return;

    var containerRect = container.getBoundingClientRect();
    var leftWidth = e.clientX - containerRect.left;
    var rightWidth = containerRect.right - e.clientX;

    leftPanel.style.width = `${leftWidth}px`;
    rightPanel.style.flexGrow = 1; // 防止右侧面板伸展
  });

  document.addEventListener('mouseup', function (e) {
    isDragging = false;
  });

  document.getElementById('file-upload').addEventListener('change', function () {
    upload_files(this)
  });
  
  document.getElementById('single-file-upload').addEventListener('change', function () {
    upload_files(this)
  });

  document.getElementById('second-file-upload').addEventListener('change', function () {
    upload_files(this)
  });

  document.getElementById('upload-btn').addEventListener('click', function () {
    document.getElementById('file-upload').click();
  });

  document.getElementById('single-upload-btn').addEventListener('click', function () {
    document.getElementById('single-file-upload').click();
  });

  document.getElementById('second-upload-btn').addEventListener('click', function () {
    document.getElementById('second-file-upload').click();
  });

  document.getElementById('reload-upload-btn').addEventListener('click', function () {
    // 筛选出所有已处理的元素
    let filteredFiles = filesToUpload.filter(f => f.processed === 1);

    // 获取最后一个 processed === 1 的元素
    let lastProcessedFile = filteredFiles[filteredFiles.length - 1];

    // 重新上传最后一个已处理的文件
    if (lastProcessedFile) {
      document.getElementById('progressBar').style.width = '0%';
      upload_one_file(lastProcessedFile.file);
    }
  });

  document.getElementById('next-upload-btn').addEventListener('click', function () {
    var nextFile = filesToUpload.find(f => f.processed === 0);
    if (nextFile)
      upload_one_file(nextFile.file);
    else {
      document.getElementById('second-upload-btn').style.display = 'flex';
      alert('本次没有更多文件可粗里');
    }
  });
});

