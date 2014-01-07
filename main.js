/*

    Tactics8x8
	2013/02/05
	This program is MIT lisence.

*/

enchant();

//乱数発生 0～max-1
var rand = function( max ){ return ~~(Math.random() * max); }
var toRad = 3.14159/180;    //弧度法toラジアン変換
var toDeg = 180/3.14159;    //ラジアンto弧度法変換

var NUM_NEUTRALFORT = 15;   //中立砦の数

var TYPE_PLAYERMAIN = 8;
var TYPE_PLAYER = 1;
var TYPE_ENEMYMAIN = 16;
var TYPE_ENEMY = 2;
var TYPE_NEUTRAL = 0;

var MAP_OFFSET_X = 32;
var MAP_OFFSET_Y = 32;

var FRAME_WALK_D =  0;
var FRAME_WALK_L =  9;
var FRAME_WALK_R = 18;
var FRAME_WALK_U = 27;

var FRAME_ATTACK_D =  6;
var FRAME_ATTACK_L = 15;
var FRAME_ATTACK_R = 23;
var FRAME_ATTACK_U = 31;

var userAgent = "";		//実行ブラウザ種別
var soundEnable = true;	//サウンド再生可能フラグ
var smartphone = false;	//スマホ判定

//オンライン対戦設定
//var serverIP = 'http://localhost:3000/tactics';//接続サーバーアドレス
var serverIP = 'http://133.242.153.162:3000/tactics';
var versus = false; //オンライン対戦フラグ
var sessionID = 0;  //対戦セッションＩＤ
var playerID = 0;   //自分のＩＤ
var partnerID = 0;  //相手のＩＤ
var host = false;   //対戦時ホストプレイヤーフラグ
var socket;         //接続用ソケット
var connect = false;//接続フラグ
var waiting = false;//接続待機中フラグ

window.onload = function() {
	//実行ブラウザ取得
	if( (navigator.userAgent.indexOf('iPhone') > 0 && navigator.userAgent.indexOf('iPad') == -1) || navigator.userAgent.indexOf('iPod') > 0 ){
		userAgent = "iOS";
		soundEnable = false;
		smartphone = true;
	}else if( navigator.userAgent.indexOf('Android') > 0){
		userAgent = "Android";
		soundEnable = false;
		smartphone = true;
	}else if( navigator.userAgent.indexOf('Chrome') > 0){
		userAgent = "Chrome";
	}else if( navigator.userAgent.indexOf('Firefox') > 0){
		userAgent = "Firefox";
		soundEnable = false;
	}else if( navigator.userAgent.indexOf('Safari') > 0){
		userAgent = "Safari";
		soundEnable = false;
	}else if( navigator.userAgent.indexOf('IE') > 0){
		userAgent = "IE";
	}else{
		userAgent = "unknown";
	}

    game = new Core(320, 320);
    game.fps = 60;
    game.preload(
        'media/mask.png','media/arrow.png','media/pointer.png','media/icon0.png',
        'media/map.png','media/fort.png','media/chara1.png',
        'media/unit1.png','media/unit2.png','media/unit3.png',
        'media/effect1.png'
    );
    if (soundEnable) {
        game.preload(
            'media/se_zugyan.mp3','media/se_attacksword_4.mp3'
        );
    }

    //Keybind
    game.keybind(32,'a');

    game.onload = function(){
        title = new TitleScene();
        game.pushScene(title);
    };
    game.start();
};

MainScene = enchant.Class.create(enchant.Scene, {
    initialize: function() {
        enchant.Scene.call(this);

        this.backgroundColor = 'rgb(0,0,0)';

        var  mask = new Sprite(320, 320);
        mask.image = game.assets['media/mask.png'];
        this.addChild(mask);

        //マップ構築
        this.world = new World();
        this.world.parent = this;
        this.addChild(this.world);

        //操作用変数
        this.startPointing = false;
        this.endPointing = false;
        this.startX = 0;
        this.startY = 0;
        this.endX = 0;
        this.endY = 0;
        this.unitPointing = false;
        
        //時間表示
        var t = this.dspTime = new MutableText(0,8,160,"TIME: 0:00");
        t.parent = this;
        t.onenterframe = function() {
            var s = ~~(this.parent.time/30)%60;
            var m = ~~(~~(this.parent.time/30)/60);
            var ts;
            if (s < 10) ts = "0"+s; else ts = s;
            this.text = "TIME: "+m+":"+ts;
        }
        this.addChild(t);

        //派兵レート表示
        var r = this.dspRatio = new MutableText(160-24,320-24,64,"50%");
        r.world = this.world;
        r.onenterframe = function() {
            this.text = this.world.ratio+"%";
        }
        this.addChild(r);

        //派兵レートアップボタン
        var up = this.ratioUp = new Sprite(16, 16);
        up.image = game.assets['media/icon0.png'];
        up.x = 160-32-24;
        up.y = 320-24;
        up.frame = 43;
        up.world = this.world;
        up.on = false;
        up.scaleX = up.scaleY = 1.5;
        up.ontouchstart = function() {
            this.on = true;
        }
        up.ontouchend = function() {
            this.on = false;
        }
        this.addChild(up);

        //派兵レートダウンボタン
        var down = this.ratioDown = new Sprite(16, 16);
        down.image = game.assets['media/icon0.png'];
        down.x = 160+32+8;
        down.y = 320-24;
        down.frame = 43;
        down.rotation = 180;
        down.world = this.world;
        down.on = false;
        down.scaleX = down.scaleY = 1.5;
        down.ontouchstart = function() {
            this.on = true;
        }
        down.ontouchend = function() {
            this.on = false;
        }
        this.addChild(down);

        //ポインタ（元）
        var p = this.from = new Sprite(32, 32);
        p.image = game.assets['media/pointer.png'];
        p.x = 0;
        p.y = 0;
        p.opacity = 0;
        p.bx = 0;
        p.by = 0;
        p.pointing = false;
        p.target = null;
        p.onenterframe = function() {
            if (this.target) {
                this.x = this.target.x;
                this.y = this.target.y;
            } else {
                this.x = ~~(this.bx/32)*32;
                this.y = ~~(this.by/32)*32;
            }

            if (this.pointing) {
                this.opacity += 0.1;
                if (this.opacity > 1) this.opacity = 1;
            } else {
                this.opacity -= 0.1;
                if (this.opacity < 0) this.opacity = 0;
            }
        }
        this.addChild(this.from);

        //ポインタ（先）
        var p = this.to = new Sprite(32, 32);
        p.image = game.assets['media/pointer.png'];
        p.x = 0;
        p.y = 0;
        p.opacity = 0;
        p.bx = 0;
        p.by = 0;
        p.pointing = false;
        p.target = null;
        p.onenterframe = function() {
            if (this.target) {
                this.x = this.target.x;
                this.y = this.target.y;
            } else {
                this.x = ~~(this.bx/32)*32;
                this.y = ~~(this.by/32)*32;
            }

            if (this.pointing) {
                this.opacity += 0.1;
                if (this.opacity > 1) this.opacity = 1;
            } else {
                this.opacity -= 0.1;
                if (this.opacity < 0) this.opacity = 0;
            }
        }
        this.addChild(this.to);
        
        //矢印
        var a = this.arrow = new Sprite(320,32);
        a.image = game.assets['media/arrow.png'];
        a.x = 0;
        a.y = 0;
        a.scaleY = 0.5;
        a.opacity = 0;
        a.pointing = false;
        a.startX = 0;
        a.startY = 0;
        a.endX = 0;
        a.endY = 0;
        a.targetFrom = null;
        a.targetTo = null;
        a.onenterframe = function() {
            if (this.pointing) {
                this.opacity += 0.1;
                if (this.opacity > 1) this.opacity = 1;
                var sx = this.startX;
                var sy = this.startY;
                if (this.targetFrom) {
                	sx = this.targetFrom.x+16;
                	sy = this.targetFrom.y+16;
                }
                var ex = this.endX;
                var ey = this.endY;
                if (this.targetTo) {
                	ex = this.targetTo.x+16;
                	ey = this.targetTo.y+16;
                }
                this.x = sx*0.5+ex*0.5-160; //中間点
                this.y = sy*0.5+ey*0.5-16;
                var dx = ex-sx;
                var dy = ey-sy;
                this.rotation = Math.atan2(dy, dx)*toDeg;   //二点間の角度
                this.scaleX = -Math.sqrt(dx*dx+dy*dy)/320;
            } else {
                this.opacity -= 0.1;
                if (this.opacity < 0) this.opacity = 0;
            }
        }
        this.addChild(this.arrow);
        
        this.gameover = false;

        this.time = 0;
        this.time2 = 0;
    },
    onenterframe: function() {
        this.time2++;
        //対戦時に砦数が不足してる場合は再送要求
        if (versus && !host && !this.world.ready && this.time2 % 30 == 0) {
            if (this.world.forts.length != NUM_NEUTRALFORT+2) {
                this.world.clearFort();
                socket.emit('msg resend fortdata');
            } else {
                socket.emit('msg gameready');
            }
        }
        if (!this.world.ready) {
            return;
        }
        //派兵レートの変更
        if (this.time % 5 == 0) {
            if (this.ratioUp.on) {
                this.world.ratio++;
                if (this.world.ratio>90)this.world.ratio=90;
            }
            if (this.ratioDown.on) {
                this.world.ratio--;
                if (this.world.ratio<10)this.world.ratio=10;
            }
        }
        //２秒毎に思考ルーチンを動かす
        if (!versus && this.time > 30 && this.time % 60 == 0) this.think();
        
        //対戦時0.5秒毎にデータをシンクロさせる
        if (versus && host && this.time & 15 == 0) {
            //TODO
        }

        //ゲーム終了判定
        if (!this.gameover) {
            if (this.world.playerMainFort.type == TYPE_ENEMY) {
                this.tl.delay(60).then(function() {
                    if (versus) {
                        game.end(0, "LOSE!(NETWORK MODE) "+this.dspTime.text);
                    } else {
                        game.end(0, "LOSE! "+this.dspTime.text);
                    }
                });
            }
            if (this.world.enemyMainFort.type == TYPE_PLAYER) {
                var score = 999999-this.time;
                this.tl.delay(60).then(function() {
                    if (versus) {
                        game.end(0, "WIN!!(NETWORK MODE) "+this.dspTime.text);
                    } else {
                        game.end(score, "WIN!! "+this.dspTime.text);
                    }
                });
            }
        }
        this.time++;
    },
    //敵思考ルーチン
    think: function() {
        var world = this.world;
        var forts = world.forts;
        var playerUnits = world.playerUnits;
        var enemyUnits = world.enemyUnits;

        //落とせる砦の探索
        //自軍から近い砦の列挙
        for (var i = 0, len = forts.length; i < len; i++) {
            var f = forts[i];
            if (f.type == TYPE_ENEMY) {
                //自軍から一番近い砦を襲撃
                var min = 9999;
                var mf = null;
                for (var j = 0, len2 = forts.length; j < len2; j++) {
                    if (i == j) continue;
                    var f2 = forts[j];
                    if (f2.type != TYPE_ENEMY) {
                        var d = Math.sqrt(Math.pow(f2.x-f.x,2)+Math.pow(f2.y-f.y,2));
                        if (d < min) {
                            min = d;
                            mf = f2;
                        }
                    }
                }
                //移動によるＨＰ消費量を計算（適当）
                var lp = ~~(min*0.1);
                if (mf != null && mf.hp < (f.hp-lp)*world.ratioEnemy/100) {
                    //メイン砦の場合は１００以下は派兵しない
                    if (!(f.main && f.hp < 100)) {
                        world.enterEnemyUnit(f, mf.mapX, mf.mapY);
                    }
                }
            }
        }

        //メイン砦に向かうプレイヤーユニットが居たら周辺の砦から排除に向かう
        for (var i = 0, len = playerUnits.length; i < len; i++) {
            var u = playerUnits[i];
            var tx = u.toX/32;
            var ty = u.toY/32;
            if (tx == 8 && ty == 8) {
                for (var j = 0, len2 = forts.length; j < len2; j++) {
                    var f = forts[j];
                    if (f.type == TYPE_ENEMY) {
                        var d = Math.sqrt(Math.pow(u.x-f.x,2)+Math.pow(u.y-f.y,2));
                        if (d < 96) {
                            var eu = world.enterEnemyUnit(f, u.mapX, u.mapY);
                            if (eu) eu.setTarget(u);
                        }
                    }
                }
            }
        }

        //待機中ユニットは最も近い砦に戻す
        for (var i = 0, len = enemyUnits.length; i < len; i++) {
            var u = enemyUnits[i];
            if (!u.move) {
                var min = 9999;
                var mf = null;
                for (var j = 0, len2 = forts.length; j < len2; j++) {
                    if (forts[j].type == TYPE_ENEMY) {
                        var d = Math.sqrt(Math.pow(u.x-f.x,2)+Math.pow(u.y-f.y,2));
                        if (d < min) {
                            min = d;
                            mf = f;
                        }
                    }
                }
                if (mf) u.setTo(mf.mapX, mf.mapY);
            }
        }

        //各砦周辺状況の評価
            //自陣がやばかったら周囲から兵力を集める
                //無ければ落とせる砦の閾値を下げて探索
    },
    //操作系
    ontouchstart: function(e) {
        if (!this.world.ready) return;
        if (e.x<32 || e.x>320-32 || e.y<32 || e.y>320-32) return;

        var x = ~~(e.x/32);
        var y = ~~(e.y/32);
        //ユニット選択チェック
        var u = this.world.checkUnit(e.x, e.y);
        if (u != null) {
            this.unitPointing = true;
            this.from.target = u;
            this.arrow.targetFrom = u;
        } else {
            //マップ選択チェック
            var f = this.world.checkFort(x-1, y-1);
            if (f == null || f.type != TYPE_PLAYER) {
                return;
            }
            this.unitPointing = false;
            this.from.target = f;
            this.arrow.targetFrom = null;
        }

        this.startPointing = true;
        this.endPointing = true;
        this.startX = e.x;
        this.startY = e.y;
        this.endX = e.x;
        this.endY = e.y;

        this.arrow.pointing = true;
        this.arrow.startX = x*32+16;
        this.arrow.startY = y*32+16;
        this.arrow.endX = x*32+16;
        this.arrow.endY = y*32+16;

        this.from.pointing = true;
        this.from.bx = e.x;
        this.from.by = e.y;
        this.to.pointing = true;
        this.to.bx = e.x;
        this.to.by = e.y;
    },
    ontouchmove: function(e) {
        if (!this.startPointing) return;
        if (e.x<32 || e.x>320-33 || e.y<32 || e.y>320-33 || 
            this.time < 15*30 && ~~(e.x/32) == 8 && ~~(e.y/32) == 8) {

            this.endPointing = false;
            this.arrow.pointing = false;
            this.to.pointing = false;
            return;
        }
        var x = ~~(e.x/32);
        var y = ~~(e.y/32);

        this.endPointing = true;
        this.endX = e.x;
        this.endY = e.y;

        this.arrow.pointing = true;
        this.arrow.endX = x*32+16;
        this.arrow.endY = y*32+16;

        this.to.pointing = true;
        this.to.bx = e.x;
        this.to.by = e.y;
    },
    ontouchend: function(e) {
        if (!this.startPointing) return;
        this.startPointing = false;
        this.endPointing = false;
        this.arrow.pointing = false;
        this.from.pointing = false;
        this.to.pointing = false;

        if (e.x<32 || e.x>320-32 || e.y<32 || e.y>320-32) {
            return;
        }
        if (this.time < 15*30 && ~~(e.x/32) == 8 && ~~(e.y/32) == 8) {
            return;
        }
        this.endX = e.x;
        this.endY = e.y;
        this.arrow.endX = e.x;
        this.arrow.endY = e.y;
        this.to.bx = e.x;
        this.to.by = e.y;

        var sx = ~~(this.startX/32);
        var sy = ~~(this.startY/32);
        var ex = ~~(this.endX/32);
        var ey = ~~(this.endY/32);
        if (!this.unitPointing) {
            //ユニット投入
            if (sx!=ex || sy!=ey) {
                this.world.enterPlayerUnit(this.from.target, ex-1, ey-1);
            }
        } else {
            //ユニット操作
            var u = this.from.target;
            u.setTo(ex-1, ey-1);
            if (versus) {
                socket.emit('msg controlunit', {id:u.id, toX:ex-1, toY:ey-1});
            }
        }
     },
});

//ロビー用プロトコル定義
function enterRobby() {
    connect = false;
    waiting = true;
    socket = io.connect(serverIP);

    //接続通知受信
    socket.on('connected', function(id) {
        connect = true;
        playerID = id;
    });
    //待機通知受信
    socket.on('msg wait', function() {
        waiting = true;
    });
    //バトル開始通知受信
    socket.on('msg matching player', function(msg) {
        sessionID = msg.id; //セッションＩＤ
        //自分がホストかの判別
        if (msg.host == playerID) {
            parnerID = msg.guest;
            host = true;
        } else {
            parnerID = msg.host;
            host = false;
        }
        waiting = false;
    });
}

//対戦セッション開始
function startBattle(id) {
    //対戦用プロトコル設定 /tactics/:sessionID
    socket = io.connect(serverIP+'/'+sessionID);

    socket.emit('connected');

    //砦追加
    socket.on('msg send fortdata', function(msg) {
        var w = main.world;
        var f = new Fort(w.mapLayer, w.infoLayer);
        f.frame = TYPE_NEUTRAL;
        f.type = TYPE_NEUTRAL;
        var mapX = 7-msg.mapX;  //点対称にする
        var mapY = 7-msg.mapY;
        f.x = mapX*32+32;
        f.y = mapY*32+32;
        f.id = msg.id;
        f.mapX = mapX;
        f.mapY = mapY;
        f.hp = msg.hp;
        w.mapLayer.addChild(f);
        w.forts.push(f);
    });

    //砦データ再送要求
    socket.on('msg resend fortdata', function(msg) {
        main.world.sendFortData();
    });

    //ゲーム開始通知受信
    socket.on('msg gamestart', function() {
        main.world.ready = true;
    });
    
    //相手ユニット投入
    socket.on('msg enterunit', function(msg) {
        var w = main.world;
        var x = 7-msg.x;
        var y = 7-msg.y;
        w.ratioEnemy = msg.ratio;
        var f = w.checkFort(x, y);
        if (f) {
            var u = w.enterEnemyUnit(f, 7-msg.toX, 7-msg.toY);
            if (u) u.id = msg.id;
        }
    });

    //ユニット操作
    socket.on('msg controlunit', function(msg) {
        var w = main.world;
        var units = main.world.enemyUnits;
        for (var i = 0, len = units.length; i < len; i++) {
            var u = units[i];
            if (msg.id == u.id) {
                u.setTo(7-msg.toX, 7-msg.toY);
            }
        }
    });

    //相手切断
    socket.on('msg userdisconnect', function() {
        var txt = new Text(160-15*8, 152, 'USER DISCONNECT');
        main.addChild(txt);
        versus = false;
    });
}
