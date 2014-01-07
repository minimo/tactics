/*
 * テスト用サーバープログラム
 */


var app = require('http').createServer(handler)
, io = require('socket.io').listen(app)
, fs = require('fs')

//ポート3000番を使う
app.listen(3000);

// index.htmlを返す
function handler (req, res) {
    fs.readFile(__dirname + '/index.html', function (err, data) {
        if (err) {
            res.writeHead(500);
            return res.end('Error loading index.html');
        }
        res.writeHead(200);
        res.end(data);
    });
}

// ゲームサーバ用変数

// ロビーに居るユーザの配列 (id : nickname)
var robby = {};

// battleId のカウンタ
var _battleId = 0;

// ゲームサーバ処理
// ゲームサーバへの接続があったときのイベントリスナ
io.sockets.on('connection', function (socket) {

    console.log("on-connection");

    // 接続が成立したことをクライアントに通知
    socket.emit('connected');

    // 接続が途切れたときのイベントリスナを定義
    socket.on('disconnect', function () {
        // ロビーの配列から削除
        delete robby[socket.id];

        // 接続が途切れたことを通知
        socket.emit('user disconnected');
    });

    // ユーザがロビーを離れたときのイベントリスナを定義
    socket.on('leave robby', function (id) {
        delete robby[socket.id];
        socket.emit('user left');
    });

    // ロビーへ入るとき・戻ってきたときのイベントリスナを定義
    socket.on('enter robby', function (data){
        if(data.nickname){
            // ロビーのユーザ情報配列にデータを追加
            robby[socket.id] = data.nickname;
 
            // クライアントにロビーに接続できたことと、クライアントのidを通知
            socket.emit('robby entered', socket.id);
 
            // クライアントにロビーにいるユーザを通知
            socket.emit('robby info', robby);
 
            // 他のユーザに、接続があったことを通知
            socket.broadcast.emit('user joined', { id: socket.id, nickname: data.nickname });
        }
    });
 
    // バトルの申し込みがあったときのイベントリスナを定義
    socket.on('battle proposal', function(data, fn){
        if(data.to){
            // 新しいバトルに対してバトルIDを割り振る
            var battleId = _battleId ++;
 
            // 申し込みがあったことを通知
            socket.broadcast.emit('battle proposal', {from: socket.id, to: data.to, battleId: battleId});
 
            // バトルを始める
            startBattle(battleId);

            // 割り振られたバトルIDをクライアントに返答
            fn({battleId : battleId});
        }
    });
 
    // ロビーにいるユーザの情報を求められたときのイベントリスナ
    socket.on('robby info', function (data) {
        // ロビーのユーザ情報配列を返す
        socket.emit('robby info', robby);
    });
});
 
// 通信対戦を始める
function startBattle(battleId){
    // /battle/:battleId に対する接続を待ち受けるイベントリスナ
    var battle = io.of('/battle/'+ battleId).on('connection', function(socket){
 
        // ゲームを始めた旨の通知をbroadcast
        socket.on('game start', function(){
            console.log('started');
            socket.broadcast.emit('game start',{});
        });

        // ジャンプした通知をbroadcast
        socket.on('jump', function(data){
            console.log('jumped');
            socket.broadcast.emit('jump',{frame: data.frame, score: data.score, voltage: data.voltage});
        });

        // ゲームの状況をbroadcast
        socket.on('game info', function(data){
            socket.broadcast.emit('game info',{frame: data.frame, score: data.score, voltage: data.voltage});
        });
    });
}
