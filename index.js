"use strict";
const BrowserWindow = require('electron').BrowserWindow;
const app = require('electron').app;
const ipcMain = require('electron').ipcMain;
const _ = require('lodash');
const fs = require('fs-extra');
const bytes = require('bytes');

function debug(/*args*/){
	const args = JSON.stringify(_.toArray(arguments));
	console.log(args);
}

//如果downloadDir文件夹不存在，那么创建它
const downloadDir = `${__dirname}/download`;// jshint ignore:line
fs.exists(downloadDir,(e)=>{
	if(!e){
		console.log("download文件夹不存在---创建了download文件夹");
		fs.mkdirpSync(downloadDir);
	}
});

//程序加载完毕事件
app.on('ready', function(){
	const win = new BrowserWindow({
		width: 900,
		height: 610,
		webPreferences: {
			//是否完整支持node
			nodeIntegration: false,
			//界面的其它脚本运行之前预先加载一个指定脚本. 这个脚本将一直可以使用 node APIs 无论 node integration 是否开启. 脚本路径为绝对路径.
			preload: __dirname + '/preload.js' //jshint ignore:line
		}
	});
	//程序关闭事件
	win.on('minimize', () => {
        app.quit();
    });
	win.loadURL('https://wx.qq.com/?lang=zh_CN&t=' + Date.now());
	win.openDevTools();
	win.webContents.session.on('will-download', function(e, item){
		//e.preventDefault()
		const url = item.getURL();
		const mime = item.getMimeType();
		const filename = item.getFilename();
		const total = item.getTotalBytes();
		debug('开始下载', filename, mime, bytes(total), url);
		item.setSavePath(`${downloadDir}/${filename}`);
		item.on('updated', function() {
			// debug('下载中', filename, item.getReceivedBytes())
		});
		item.on('done', function(e, state){
			if (state === 'completed') {
				debug('下载完成', filename);
			} else {
				debug('下载失败', filename);
			}
		});
	});
});