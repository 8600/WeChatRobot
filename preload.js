"use strict";
/* jshint -W117 */
const clipboard = require('electron').clipboard;
const nativeImage = require('electron').nativeImage;
const ipcRenderer = require('electron').ipcRenderer;
const _ = require('lodash');

// 应对 微信网页偷换了console 使起失效
// 保住console引用 便于使用
window._console = window.console;

function debug(/*args*/){
	var args = JSON.stringify(_.toArray(arguments));
	_console.log(args);
}

// 禁止外层网页滚动 影响使用
document.addEventListener('DOMContentLoaded', () => {
	// document.body.style.height = '100%'
	document.body.style.overflow = 'hidden';
});

let free = true;

// 适当清理历史 缓解dom数量
function reset(){
	const msgs = $('#chatArea').scope().chatContent;	
	if (msgs.length >= 30) msgs.splice(0, 20);
	$('img[src*=filehelper]').closest('.chat_item')[0].click();
	free = true;
}

function textMessage($msg){
		
}

//系统消息处理函数
function systemMessage($msg){
	_console.log("系统消息！");
		const ctn = $msg.find('.content').text();
		switch (ctn){
			case '收到红包，请在手机上查看':reply.text = '发毛红包';break;
			case '位置共享已经结束':reply.text = '位置共享已经结束';break;
			case '实时对讲已经结束':reply.text = '实时对讲已经结束';break;
			default:{
				if (ctn.match(/(.+)邀请(.+)加入了群聊/)) {
					reply.text = '加毛人';
				} else if (ctn.match(/(.+)撤回了一条消息/)) {
					reply.text = '撤你妹';
				} 
			}
		}
}

let reply = {};

//回复消息函数
function replyMessage2(){
	let from,room;
	// 自动回复 相同的内容
	let $msg = $('.chat_bd.scrollbar-dynamic.scroll-content');
	_console.log($msg);
	$msg = $('.message.ng-scope').last();
	_console.log($msg);
	$msg = $msg.find('div');
	const $message = $msg.closest('.message');
	const $nickname = $message.find('.nickname');
	const $titlename = $('.title_name');
	if ($nickname.length) { // 群聊
		from = $nickname.text();
		room = $titlename.text();
	} else { // 单聊
		from = $titlename.text();
		room = null;
	}
	debug('来自', from, room);// 这里的nickname会被remark覆盖
	_console.log($msg);
	// 系统消息暂时无法捕获
	// 因为不产生红点 而目前我们依靠红点 可以改善
	if ($msg.is('.message_system')) {
		systemMessage($msg);
	} else if ($msg.is('.emoticon')) { // 自定义表情
		var src = $msg.find('.msg-img').prop('src');
		debug('接收', 'emoticon', src);
		reply.text = '发毛表情';
	} else if ($msg.is('.picture')) {
		var src = $msg.find('.msg-img').prop('src');
		debug('接收', 'picture', src);
		// reply.text = '发毛图片'
		reply.image = './fuck.jpeg';
	} else if ($msg.is('.location')) {
		//var src = $msg.find('.img').prop('src')
		var desc = $msg.find('.desc').text();
		debug('接收', 'location', desc);
		reply.text = desc;
	} else if ($msg.is('.attach')) {
		var title = $msg.find('.title').text();
		var size = $msg.find('span:first').text();
		var $download = $msg.find('a[download]'); // 可触发下载
		debug('接收', 'attach', title, size);
		reply.text = title + '\n' + size;
	} else if ($msg.is('.microvideo')) {
		var poster = $msg.find('img').prop('src'); // 限制
		var src = $msg.find('video').prop('src'); // 限制
		debug('接收', 'microvideo', src);
		reply.text = '发毛小视频';
	} else if ($msg.is('.video')) {
		var poster = $msg.find('.msg-img').prop('src'); // 限制
		debug('接收', 'video', src);
		reply.text = '发毛视频';
	} else if ($msg.is('.voice')) {
		$msg[0].click();
		var duration = parseInt($msg.find('.duration').text());
		var src = $('#jp_audio_1').prop('src'); // 认证限制
		var msgid = src.match(/msgid=(\d+)/)[1];
		var date = new Date().toJSON()
			.replace(/\..+/, '')
			.replace(/[\-:]/g, '')
			.replace('T', '-');
		// 20150927-164539_5656119287354277662.mp3
		var filename = `${date}_${msgid}.mp3`;
		$('<a>').attr({
			download: filename,
			href: src
		})[0].click(); // 触发下载
		debug('接收', 'voice', `${duration}s`, src);
		reply.text = '发毛语音';
	} else if ($msg.is('.card')) {
		var name = $msg.find('.display_name').text();
		var wxid = $msg.find('.signature').text();
		var img = $msg.find('.img').prop('src'); // 认证限制
		debug('接收', 'card', name, wxid);
		reply.text = name + '\n' + wxid;
	} else if ($msg.is('a.app')) {
		var url = $msg.attr('href');
		url = decodeURIComponent(url.match(/requrl=(.+?)&/)[1]);
		var title = $msg.find('.title').text();
		var desc = $msg.find('.desc').text();
		var img = $msg.find('.cover').prop('src'); // 认证限制
		debug('接收', 'link', title, desc, url);
		reply.text = title + '\n' + url;
	} else if ($msg.is('.plain')) {
		textMessage($msg);
	}
	debug('回复', reply);

	// 借用clipboard 实现输入文字 更新ng-model=EditAreaCtn
	// ~~直接设#editArea的innerText无效 暂时找不到其他方法~~
	paste(reply);

	// 发送text 可以直接更新scope中的变量 @昌爷 提点
	// 但不知为毛 发不了表情
	// if (reply.image) {
	// 	paste(reply)
	// } else {
	// 	angular.element('#editArea').scope().editAreaCtn = reply.text
	// }


	// $('.web_wechat_face')[0].click()
	// $('[title=阴险]')[0].click()

	if (reply.image) {
		setTimeout(function(){
			var tryClickBtn = setInterval(function(){
				var $btn = $('.dialog_ft .btn_primary');
				if ($btn.length) {
					$('.dialog_ft .btn_primary')[0].click();
				} else {
					clearInterval(tryClickBtn);
					reset();
				}
			}, 200);
		}, 100);
	} else {
		$('.btn_send')[0].click();
		reset();
	}
}

// 文字消息处理函数
function plain(msg){
	_console.log("文字消息！");
		let text = '';
		_console.log(msg);
		var $text = msg.find('.js_message_plain');
		_console.log();
		$text.contents().each(function(i, node){
			if (node.nodeType === Node.TEXT_NODE) {
				text += node.nodeValue;
			} else if (node.nodeType === Node.ELEMENT_NODE) {
				var $el = $(node);
				if ($el.is('br')) text += '\n';
				else if ($el.is('.qqemoji, .emoji')) {
					text += $el.attr('text').replace(/_web$/, '');
				}
			}
		});
		switch(text){
			case `[收到了一个表情，请在手机上查看]`:text="收到一个表情";break;
			case `[收到一条微信转账消息，请在手机上查看]`:text="收到一条转账";break;
			case `[收到一条视频/语音聊天消息，请在手机上查看]`:text="收到一个语音";break;
			case `我发起了实时对讲`:text="收到一条对讲";break;
			case `该类型暂不支持，请在手机上查看`:text="未知消息";break;
			case `[Received a sticker. View on phone]`:text="未知消息";break;
			case `[Received transfer. View on phone.]`:text="未知消息";break;
			case `[Received video/voice chat message. View on phone.]`:text="未知消息";break;
			case `该类型暂不支持，请在手机上查看`:text="未知消息";break;
		}
		reply.text = text;
}

function picture(msg){
	var src = msg.find('.msg-img').prop('src');
	reply.image = './huaji.png';
}

function replyMessage(){
	//获取消息体dom
	let msg = $('.chat_bd.scrollbar-dynamic.scroll-content');
	msg = $('.message.ng-scope').last();
	msg = msg.find('div');
	const message = msg.closest('.message');
	//获取发送人名
	const nickname = $('.title_name.ng-binding').text();
	//获取消息窗口标题
	const titlename = message.find(`.nickname.ng-binding.ng-scope`).text();
	if(titlename===""){
		_console.log(`收到好友消息---${nickname}`);
	}
	else{
		_console.log(`收到群消息---${titlename}---${nickname}`);
	}
	//得到消息类型
	//_console.log(msg);
	const messageType=msg[3].className;
	_console.log(messageType);
	switch(messageType){
		case `plain`:plain(msg);break;
		case `picture`:picture(msg);break;
	}
	paste(reply);

	if (reply.image) {
		setTimeout(function(){
			var tryClickBtn = setInterval(function(){
				var $btn = $('.dialog_ft .btn_primary');
				if ($btn.length) {
					$('.dialog_ft .btn_primary')[0].click();
				} else {
					clearInterval(tryClickBtn);
					reset();
				}
			}, 200);
		}, 100);
	} else {
		$('.btn_send')[0].click();
		reset();
	}

	reset();
	setTimeout(onLogin,100);
}

// 收到新消息处理函数
function onReddot($chat_item) {
	// 判断是否在执行内存清理
	if (!free) return
	free = false
	//将焦点移动到发来消息人的对话框
	$chat_item[0].click();
	_console.log(`接收到未读消息，打开聊天窗口！`);
	setTimeout(replyMessage, 200);
}

// 登陆成功开始定时监测
function onLogin(){
	const $reddot = $('.web_wechat_reddot_middle').last();
	if ($reddot.length !== 0) {
		console.log('检测到未读消息!')
		const $chat_item = $reddot.closest('.chat_item')
		// 交给处理函数
		onReddot($chat_item);
	}
	else{
		_console.log(`没有接收到未读消息！`);
		setTimeout(onLogin,1000);
	}
}

function chak(){
	const chat_item = document.querySelector('.chat_item');
	if (chat_item!==null) {
		_console.log(`二维码登录成功，正在获取消息`);
		//清除微信阻止关闭事件
		window.onbeforeunload="";
		setTimeout(onLogin,200);
	}
	else{
		_console.log(`还没有扫描二维码！`);
		setTimeout(chak, 2500);
	}
}




function paste(opt){
	var oldImage = clipboard.readImage();
	var oldHtml = clipboard.readHtml();
	var oldText = clipboard.readText();
	clipboard.clear(); // 必须清空
	if (opt.image) {
		// 不知为啥 linux上 clipboard+nativeimage无效
		try {
			clipboard.writeImage(nativeImage.createFromPath(opt.image));
		} catch (err) {
			opt.image = null;
			opt.text = '妈蛋 发不出图片';
		}
	}
	if (opt.html) clipboard.writeHtml(opt.html);
	if (opt.text) clipboard.writeText(opt.text);
	$('#editArea')[0].focus();
	document.execCommand('paste');
	clipboard.writeImage(oldImage);
	clipboard.writeHtml(oldHtml);
	clipboard.writeText(oldText);
}

_console.log(`开始检查验证码状态`);
setTimeout(chak, 2500);