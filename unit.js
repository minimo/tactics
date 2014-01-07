/*

    Tactics8x8
    unit.js
	2013/02/05
	This program is MIT lisence.

*/

enchant();

//ユニット管理基本クラス
Unit = enchant.Class.create(enchant.Group, {
    initialize: function(parent, infoLayer) {
        enchant.Group.call(this);
        
        //スプライト
        var s = this.sprite = new Sprite(32,32);
        s.image = game.assets['media/unit1.png']
        s.frame = FRAME_WALK_D;
        this.addChild(s);
        this.frameBase = FRAME_WALK_D;
        this.frameAdd = 0;

        //親シーン
        this.parent = parent;
        this.infoLayer = infoLayer;
        
        //ステータス
        this.hp = 10;  //体力
        this.ap = 1;    //攻撃力
        this.dp = 1;    //防御力
        this.speed = 0.5; //移動速度
        this.move = true;   //行動フラグ
        this.type = 0;
        this.using = true;
        this.id = -1;   //ユニットＩＤ
        
        //移動目標
        this.target = null; //目標ユニット  
        this.targetX = 0;   //目標座標（ユニット以外の場合）
        this.targetY = 0;
        
        //移動情報
        this.fromX = 0; //起点（グリッド左上）
        this.fromY = 0;
        this.toX = 0;   //終点（グリッド左上）
        this.toY = 0;
        this.direction = 0;

        //攻撃情報
        this.attack = false;
        this.attackTarget = null;

        //ＨＰ表示        
        var d = this.dsp = new Label("");
        d.x = 5;
        d.y = -10;
        d.color = "#ffffff";
        d.font = "10px bold";
        d.parent = this;
        d.onenterframe = function() {
            this.x = this.parent.x+5;
            this.y = this.parent.y-12;
            this.text = ""+this.parent.hp;
        }
        this.infoLayer.addChild(d);
        this.time = 0;
    },
    onenterframe: function() {
        if (this.type == TYPE_PLAYER) {
            this.dsp.color = "#aaaaff";
        }
        if (this.type == TYPE_ENEMY) {
            this.dsp.color = "#ffaaaa";
        }
        if (this.target && !this.target.using) {
            this.target = null;
            this.move = false;
        }

        //移動処理（攻撃中は足止め）
        if (this.move && !this.attack) {
            if (this.target) {
                var gx = this.x;
                var gy = this.y;
                var tx = this.target.x;
                var ty = this.target.y;
                var d = Math.sqrt((tx-gx)*(tx-gx) + (ty-gy)*(ty-gy));
                if (d != 0) {
                    this.vx = (tx-gx)/d*this.speed*1.3;
                    this.vy = (ty-gy)/d*this.speed*1.3;
                } else {
                    this.vx = 0;
                    this.vy = 0;
                }

                this.fromX = ~~(this.x/32)*32;
                this.fromY = ~~(this.y/32)*32;
                this.toX = tx;
                this.toY = ty;
            }
            this.x+=this.vx;
            this.y+=this.vy;
            var gx = ~~this.x;
            var gy = ~~this.y;
            if (this.toX-2 < gx && gx < this.toX+2 && this.toY-2 < gy && gy < this.toY+2) {
                this.move = false;
                this.x = this.toX;
                this.y = this.toY;
            }

            if (this.time % 45 == 0) {
                this.hp--;
            }

            //ユニットの進行方向判定
            var tx = this.x+this.vx;
            var ty = this.y+this.vy;
            var rot = Math.atan2(ty-this.y,tx-this.x)*toDeg;
            //右
            if (-45 < rot || rot < 45) {
                this.direction = 0;
                this.frameBase = FRAME_WALK_R;
            }
            //下
            if (rot >= 45 && rot < 135) {
                this.direction = 1;
                this.frameBase = FRAME_WALK_D;
            }
            //左
            if (rot > 135 || rot < -135) {
                this.direction = 2;
                this.frameBase = FRAME_WALK_L;
            }
            //上
            if (rot < -45 && rot >= -135) {
                this.direction = 3;
                this.frameBase = FRAME_WALK_U;
            }

            //移動アニメーション
            if (this.time % 15 == 0) {
                this.frameAdd++;
                this.frame = this.frameBase+this.frameAdd;
                if (this.frame == this.frameBase+3){
                    this.frame=this.frameBase;
                    this.frameAdd = 0;
                }
            }
        }

        //停止中はＨＰ減少が少ない
        if (!this.move && this.time % 90 == 0) this.hp--;

        //攻撃処理
        if (this.attackTarget) {
            var at = this.attackTarget;
            this.attackTarget = null;
            this.frame = this.frameBase+6;
            this.tl.repeat(function() {
                if (this.time % 6 == 0) {
                    this.frame++;
                    if (this.frame > this.frameBase+8)this.frame--;
                }
            }, 20).delay(10).then(function() {
                this.attack = false;
            });
            if (soundEnable) game.assets['media/se_attacksword_4.mp3'].clone().play();
        }

        //死亡判定
        if (this.hp < 1) {
            this.dead();
        }
        this.time++;
    },
    onremoved: function() {
        this.infoLayer.removeChild(this.dsp);
    },
    //移動先指定（グリッド単位）
    setTo: function(x, y) {
        var gx = this.x;
        var gy = this.y;
        var tx = x*32+MAP_OFFSET_X;
        var ty = y*32+MAP_OFFSET_Y;
        var d = Math.sqrt((tx-gx)*(tx-gx) + (ty-gy)*(ty-gy));
        if (d == 0)return;
        this.vx = (tx-gx)/d*this.speed;
        this.vy = (ty-gy)/d*this.speed;

        this.fromX = ~~(this.x/32)*32;
        this.fromY = ~~(this.y/32)*32;
        this.toX = x*32+MAP_OFFSET_X;
        this.toY = y*32+MAP_OFFSET_X;
        this.target = null;
        this.move = true;
    },
    setTarget: function(target) {
        this.target = target;
        this.move = true;
    },
    dead: function() {
        this.using = false;
        this.parent.removeChild(this);
        var e = new Sprite(32, 48);
        e.image = game.assets['media/effect1.png'];
        e.frame = 0;
        e.x = this.x;
        e.y = this.y-16;
        e.parent = this.parent;
        e.onenterframe = function() {
            if (this.age % 3 == 0) {
                this.frame++;
                if (this.frame == 8) {
                    this.parent.removeChild(this);
                }
            }
        }
        this.parent.addChild(e);
    },
    frame: {
        get: function() {
            return this.sprite.frame;
        },
        set: function(f) {
            this.sprite.frame = f;
        }
    },
    mapX: {
        get: function() {
            return ~~(this.x/32)-1;
        },
        set: function(x) {
            this.x = x*32+32;
        }
    },
    mapY: {
        get: function() {
            return ~~(this.y/32)-1;
        },
        set: function(y) {
            this.y = y*32+32;
        }
    }
});
