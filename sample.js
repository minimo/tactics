
// 接続するサーバのアドレスを指定
var server = 'http://localhost:3000';
//var server = 'http://182.48.46.45:3000';
 
// ロビーに接続する関数
function enterRobby(){
    var socket = io.connect(server);
 
    // 接続できたというメッセージを受け取ったら
    socket.on('connect', function() {
        robby.emit('enter robby',{'nickname': prompt("enter your nickname")});
        waiting = true;
        matchingScene();
    });

    // ロビーに入ったというメッセージを受け取ったら
    socket.on('robby entered', function(id){
        socket.id = id;
    })

    // 他のユーザが接続を解除したら
    socket.on('user disconected', function(data) {
        console.log('user disconnected:', data.id);
    });

    // ロビーのユーザ一覧を受け取ったら
    socket.on('robby info', function(robbyInfo) {
        console.log('robby info', robbyInfo);
        for(var id in robbyInfo){
            // 誰かいたら無条件でバトル申し込み
            if(id != robbyInfo.id){
                var enemyId = id;
                var enemyNick = robby[id];
                break;
            }
        }
        // バトルの相手が居たら…
        if(enemyId){
            // バトル申し込みのメッセージを送信
            robby.emit('battle proposal', {to: enemyId}, function(data){
                // 返信がきたときのコールバック
                waiting = false;
                var that = data;
                // マッチング完了のというシーンを表示
                matchedScene(function(){
                    game.popScene();
                    battleStart(robby.id, enemyId, that.battleId);
                });
            })
        }
    });

    // バトル申し込みを受け取ったら
    socket.on('battle proposal', function(data) {
        // 自分宛のものかどうか確かめる
        if(data.to == robby.id){
            // マッチング完了のシーンを表示して、バトルスタート
            matchedScene(function(){
                game.popScene();
                battleStart(robby.id, data.from, data.battleId);
            });
        }
    });
}

// バトルスタート
function battleStart(myId, enemyId, battleId){
    // まずロビーを離脱
    robby.emit('leave robby', {id: robby.id});

    game.started = false;
    game.emittedStartSignal = false;

    // ゲームスタート待機
    game.begin();
    game.ready();

    // 新しく、http://localhost:3000/battle/:battleID と接続
    battle = io.connect(server + '/battle/' + battleId);

    // バトルルームとの接続が確立されたら
    battle.on('connect', function() {
        waiting = true;
    });

    // ゲームが始まった通知を受け取ったら
    battle.on('game start', function() {
        console.log('game start');
        game.popScene();
    });

    // 相手がジャンプした通知を受け取ったら
    battle.on('jump', function(data) {
        // 相手の神輿をジャンプさせる
        mikoshi2.jump();
        // データを更新
        enemy.voltage = data.voltage;
        enemy.score = data.score;
    });

    // ゲームが始めた通知を送る
    sendStart = function(){
        battle.emit('game start', {});
    }

    // ジャンプしたという通知を送る
    sendJump = function(frame){
        battle.emit('jump', {frame: frame, voltage: game.voltage, score: game.score});
    }
}

enemy = {voltage: 0, score: 0};

// マッチング中の画面を表示
function matchingScene(){
    var matchingScene = new SplashScene();
    matchingScene.image = game.assets['image/matching.png'];
    game.pushScene(matchingScene);
}

// マッチング成立の画面を表示し、2秒後に引数の関数を呼ぶ
function matchedScene(func){
    game.popScene();

    var matchingScene = new SplashScene();
    matchingScene.image = game.assets['image/matching.png'];
    game.pushScene(matchingScene);
    setTimeout(func, 2000);
}