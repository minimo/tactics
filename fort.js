/*

    Tactics8x8
    fort.js
	2013/02/05
	This program is MIT lisence.

*/

enchant();

//砦管理クラス
Fort = enchant.Class.create(enchant.Group, {
    initialize: function(parent, infoLayer) {
        enchant.Group.call(this);
        
        //スプライト
        var s = this.sprite = new Sprite(32,32);
        s.image = game.assets['media/fort.png']
        s.frame = 0;
        this.addChild(s);
        
        //親シーン
        this.parent = parent;
        this.infoLayer = infoLayer;
        
        //ステータス
        this.hp = 100;  //体力
        this.main = false;
        
        //ＨＰ表示        
        var d = this.dsp = new Label("");
		d.color = "#ffffff";
		d.font = "10px bold";
//        d.textAlign = 'center';
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
        this.time++;
    },
    onremoved: function() {
        this.infoLayer.removeChild(this.dsp);
    },
    dead: function() {
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
