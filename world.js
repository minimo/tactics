/*

    Tactics8x8
    world.js
	2013/02/05
	This program is MIT lisence.

*/

enchant();

//マップ管理クラス
World = enchant.Class.create(enchant.Group, {
    initialize: function(mapLayer, unitLayer, infoLayer) {
        enchant.Group.call(this);
        this.time++;
        
        //親シーン
        this.parent = null;
        
        //表示レイヤー用グループ
        this.mapLayer = new Group();
        this.unitLayer = new Group();
        this.infoLayer = new Group();
        this.addChild(this.mapLayer);
        this.addChild(this.unitLayer);
        this.addChild(this.infoLayer);
        
        //派兵レート
        this.ratio = 50;
        this.ratioEnemy = 60;

        //ユニット用配列
        this.playerUnits = [];
        this.enemyUnits = [];
        this.unitID = 0;
        
        //砦設定
        this.forts = [];

        //ゲーム準備完了フラグ
        if (!versus) {
            this.fortOK = true;
            this.ready = true;
        } else {
            this.fortOK = false;
            this.ready = false;
        }
        
        //待機中表示
        var ws = this.waitSign = new MutableText(160-8*4, 160-8, 16*5, "WAIT");
        ws.parent = this;
        ws.onenterframe = function() {
            if (this.parent.ready) {
                this.visible = false;
            } else {
                this.visible = true;
            }
        }
        this.addChild(ws);

        //マップ構築
        this.createMap();

        this.time = 0;
    },
    onenterframe: function() {
        if (!this.ready) return;

        //プレイヤーユニット行動チェック
        for (var i = 0; i < this.playerUnits.length; i++) {
            var u = this.playerUnits[i];
            //行動終了
            if (!u.move) {
                var f = this.checkFort(u.mapX, u.mapY);
                if (f) {
                    //自分の砦の場合
                    if (f.type == TYPE_PLAYER) {
                        f.hp+=u.hp;
                        u.parent.removeChild(u);
                        u.using = false;
                        this.playerUnits.splice(i,1);
                    }
                    //敵または中立の砦の場合
                    if (f.type == TYPE_ENEMY || f.type == TYPE_NEUTRAL) {
                        f.hp-=u.hp;
                        if (f.hp < 1) {
                            f.dead();
                            if (f.main) {
                                f.frame = TYPE_ENEMYMAIN+2;
                            } else {
                                f.frame = TYPE_PLAYER;
                            }
                            f.type = TYPE_PLAYER;
                            f.hp*=-1;
                        }
                        u.dead();
                        u.using = false;
                        this.playerUnits.splice(i,1);
                        if (soundEnable) game.assets['media/se_zugyan.mp3'].clone().play();
                    }
                }
                //同一座標上のユニットは合流させる
                for (var j = 0; j < this.playerUnits.length; j++) {
                    if (i == j) continue;
                    var u2 = this.playerUnits[j];
                    if (u2.move) continue;  //移動中ユニットは合流しない
                    if (u.mapX == u2.mapX && u.mapY == u2.mapY) {
                        u.hp += u2.hp;
                        u2.parent.removeChild(u2);
                        u2.using = false;
                        this.playerUnits.splice(j,1);
                    }
                }
            }
        }

        //敵ユニット行動チェック
        for (var i = 0; i < this.enemyUnits.length; i++) {
            var u = this.enemyUnits[i];
            //行動終了
            if (!u.move) {
                var f = this.checkFort(u.mapX, u.mapY);
                if (f) {
                    //自分の砦の場合
                    if (f.type == TYPE_ENEMY) {
                        f.hp+=u.hp;
                        u.parent.removeChild(u);
                        u.using = false;
                        this.enemyUnits.splice(i,1);
                    }
                    //敵または中立の砦の場合
                    if (f.type == TYPE_PLAYER || f.type == TYPE_NEUTRAL) {
                        f.hp-=u.hp;
                        if (f.hp < 1) {
                            f.dead();
                            if (f.main) {
                                f.frame = TYPE_PLAYERMAIN+2;
                            } else {
                                f.frame = TYPE_ENEMY;
                            }
                            f.type = TYPE_ENEMY;
                            f.hp*=-1;
                            if (soundEnable) game.assets['media/se_zugyan.mp3'].clone().play();
                        }
                        u.dead();
                        this.enemyUnits.splice(i,1);
                    }
                }
                //同一座標上のユニットは合流させる
                for (var j = 0; j < this.enemyUnits.length; j++) {
                    if (i == j) continue;
                    var u2 = this.enemyUnits[j];
                    if (u2.move) continue;  //移動中ユニットは合流しない
                    if (u.mapX == u2.mapX && u.mapY == u2.mapY) {
                        u.hp += u2.hp;
                        u2.parent.removeChild(u2);
                        u2.using = false;
                        this.playerUnits.splice(j,1);
                    }
                }
            }
        }

        //プレイヤーユニット、敵ユニット相互干渉
        //0.5秒毎に処理
        if (this.time % 15 == 0) {
            for (var i = 0, len = this.playerUnits.length; i < len; i++) {
                var p = this.playerUnits[i];
                for (var j = 0, len2 = this.enemyUnits.length; j < len2; j++) {
                    var e = this.enemyUnits[j];
                    var d = Math.sqrt(Math.pow(e.x-p.x,2)+Math.pow(e.y-p.y,2));
                    if (d < 24) {
                        p.attack = true;
                        p.attackTarget = e;
                        e.attack = true;
                        e.attackTarget = p;

                        var pa = p.hp;
                        var ea = e.hp;
                        p.hp -= ea;
                        e.hp -= pa;
                        if (p.hp < 0) p.hp = 0;
                        if (e.hp < 0) e.hp = 0;
                    }
                }
            }
        }

        //ユニット死亡確認
        for (var i = 0; i < this.playerUnits.length; i++) {
            var u = this.playerUnits[i];
            if (u.hp < 1){
                u.dead();
                u.using = false;
                this.playerUnits.splice(i,1);
            }
        }
        for (var i = 0; i < this.enemyUnits.length; i++) {
            var u = this.enemyUnits[i];
            if (u.hp < 1){
                u.dead();
                u.using = false;
                this.enemyUnits.splice(i,1);
            }
        }

        //砦ＨＰ回復        
        for( var i = 0, len = this.forts.length; i < len; i++) {
            var f = this.forts[i];
            if (!versus) {
                //プレイヤーメイン砦回復
                if (f.type == TYPE_PLAYER && f.main && this.time % 25 == 0) f.hp++;
                //プレイヤー砦回復
                if (f.type == TYPE_PLAYER && !f.main && this.time % 30 == 0) f.hp++;
                //敵砦回復
                if (f.type == TYPE_ENEMY && this.time % 50 == 0) f.hp++;
            } else {
                //砦回復
                if (f.type != TYPE_NEUTRAL) {
                    if (f.main && this.time % 25 == 0) f.hp++;
                    if (!f.main && this.time % 30 == 0) f.hp++;
                }
            }
        }
        
        this.time++;
    },
    //マップ構築
    createMap:function() {
        //地形用
        this.map = [
            [ 0, 0, 0, 0, 0, 0, 0, 0],
            [ 0, 0, 0, 0, 0, 0, 0, 0],
            [ 0, 0, 0, 0, 0, 0, 0, 0],
            [ 0, 0, 0, 0, 0, 0, 0, 0],
            [ 0, 0, 0, 0, 0, 0, 0, 0],
            [ 0, 0, 0, 0, 0, 0, 0, 0],
            [ 0, 0, 0, 0, 0, 0, 0, 0],
            [ 0, 0, 0, 0, 0, 0, 0, 0],
        ];
        for (var x = 0; x < 8; x++) {
            for (var y = 0; y < 8; y++) {
                var f = new Sprite(32,32);
                f.image = game.assets['media/map.png'];
                f.frame = this.map[x][y];
                f.x = x*32+32;
                f.y = y*32+32;
                this.mapLayer.addChild(f);
                this.map[x][y] = f;
            }
        }

        //プレイヤ本拠設定
        var f = new Fort(this.mapLayer, this.infoLayer);
        f.frame = TYPE_PLAYERMAIN;
        f.type = TYPE_PLAYER;
        f.x = 32;
        f.y = 32;
        f.mapX = 0;
        f.mapY = 0;
        f.hp = 600;
        f.id = 0;
        f.main = true;
        this.mapLayer.addChild(f);
        this.forts.push(f);
        this.playerMainFort = f;

        //敵本拠設定
        var f = new Fort(this.mapLayer, this.infoLayer);
        f.frame = TYPE_ENEMYMAIN;
        f.type = TYPE_ENEMY;
        f.x = 8*32;
        f.y = 8*32;
        f.mapX = 7;
        f.mapY = 7;
        f.hp = 500;
        f.id = 0;
        if (versus) f.hp = 600;
        f.main = true;
        this.mapLayer.addChild(f);
        this.forts.push(f);
        this.enemyMainFort = f;
        
        //中立砦設定
        if (versus && host || !versus){
            for (var i = 0; i < NUM_NEUTRALFORT; i++) {
                var x = rand(8);
                var y = rand(8);
                if (this.checkFort(x,y) != null || 
                    x < 2 && y < 2 || x > 5 && y > 5) {
                    i--;
                    continue;
                }

                var f = new Fort(this.mapLayer, this.infoLayer);
                f.frame = TYPE_NEUTRAL;
                f.type = TYPE_NEUTRAL;
                f.x = x*32+32;
                f.y = y*32+32;
                f.mapX = x;
                f.mapY = y;
                f.hp = rand(60)+10;
                f.id = i+1;
                this.mapLayer.addChild(f);
                this.forts.push(f);
            }
            //対戦でホストの場合、マップデータを相手へ送信
            if (versus && host) this.sendFortData();
        }
    },
    //砦データ一括送信
    sendFortData: function() {
        for (var i = 2, len = this.forts.length; i < len; i++) {
            var f = this.forts[i];
            socket.emit('msg send fortdata', {id:f.id, mapX:f.mapX, mapY:f.mapY, hp:f.hp});
        }
    },
    //砦データの全消去（再構築用）
    clearFort: function() {
        for (var i = 0, len = this.forts; i < len; i++) {
            this.mapLayer.removeChild(this.forts[i]);
        }
        this.forts.length = 0;
    },
    //プレイヤーユニット投入
    //x,y: 移動目標座標（グリッド単位）
    enterPlayerUnit: function(fort, ex, ey) {
        if (fort.hp < 10) return null;
        this.unitID++;
        var u = new Unit(this.unitLayer, this.infoLayer);
        u.sprite.image = game.assets['media/unit1.png'];
        u.x = fort.mapX*32+32;
        u.y = fort.mapY*32+32;
        u.hp = ~~(fort.hp*this.ratio/100);
        u.id = this.unitID;
        u.type = TYPE_PLAYER;
        fort.hp -= u.hp;
        u.setTo(ex,ey);
        this.unitLayer.addChild(u);
        this.playerUnits.push(u);

        //通信対戦時は相手に情報を送信
        if (versus) {
            socket.emit('msg enterunit',{id:u.id, x:fort.mapX, y:fort.mapY, hp:u.hp, toX:ex, toY:ey, ratio:this.ratio});
        }
        return u;
    },
    //敵ユニット投入
    //x,y: 移動目標座標（グリッド単位）
    enterEnemyUnit: function(fort, ex, ey) {
        if (fort.hp < 10) return null;
        var u = new Unit(this.unitLayer, this.infoLayer);
        u.sprite.image = game.assets['media/unit2.png'];
        u.x = fort.mapX*32+32;
        u.y = fort.mapY*32+32;
        if (u.x < 0 || u.y < 0) {
            alert("check!!");
        }
        u.hp = ~~(fort.hp*this.ratioEnemy/100);
        u.type = TYPE_ENEMY;
        fort.hp -= u.hp;
        u.setTo(ex,ey);
        this.unitLayer.addChild(u);
        this.enemyUnits.push(u);
        return u;
    },
    //砦チェック（グリッド指定）
    checkFort: function(x,y) {
        for (var i = 0, len = this.forts.length; i < len; i++) {
            var f = this.forts[i];
            if (x == f.mapX && y == f.mapY) {
                return f;
            }
        }
        return null;
    },
    //ＩＤで砦探索
    findFort: function(id) {
        for (var i = 0, len = this.forts.length; i < len; i++) {
            if (id == this.forts[i].id) {
                return this.forts[i];
            }
        }
        return null;
    },
    //プレイヤーユニットチェック（ピクセル指定）
    checkUnit: function(x, y) {
        var min = 9999;
        var ret = null;
        for (var i = 0, len = this.playerUnits.length; i < len; i++) {
            var u = this.playerUnits[i];
            var vx = u.x-x+16;
            var vy = u.y-y+16;
            var d = Math.sqrt(vx*vx+vy*vy);
            if (d < 10) {
                if (d < min) {
                    min = d;
                    ret = u;
                }
            }
        }
        return ret;
    },
    //敵ユニットチェック（ピクセル指定）
    checkEnemyUnit: function(x, y) {
        var min = 9999;
        var ret = null;
        for (var i = 0, len = this.enemyUnits.length; i < len; i++) {
            var u = this.playerUnits[i];
            var vx = u.x-x+16;
            var vy = u.y-y+16;
            var d = Math.sqrt(vx*vx+vy*vy);
            if (d < 10) {
                if (d < min) {
                    min = d;
                    ret = u;
                }
            }
        }
        return ret;
    },
    //プレイヤー砦数
    numPlayerFort: {
        get: function() {
            var num = 0;
            for (var i = 0, len = this.forts.length; i < len; i++) {
                if (this.forts[i].type == TYPE_PLAYER) num++;
            }
            return num;
        }
    },
    //敵砦数
    numEnemyFort: {
        get: function() {
            var num = 0;
            for (var i = 0, len = this.forts.length; i < len; i++) {
                if (this.forts[i].type == TYPE_ENEMY) num++;
            }
            return num;
        }
    },
});
