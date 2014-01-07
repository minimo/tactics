/*

    Tactics8x8
    title.js
	2013/02/05
	This program is MIT lisence.

*/

enchant();

//タイトルシーン
TitleScene = enchant.Class.create(enchant.Scene, {
    initialize: function() {
        enchant.Scene.call(this);

        this.backgroundColor = 'rgb(0,0,0)';

        var t = this.title = new Text(160-11*8,100,"TACTICS 8x8");
        this.addChild(t);
        
        var t1 = this.t1 = new Text(160-11*8,200,"SINGLE PLAY");
        this.addChild(t1);

        var t2 = this.t2 = new Text(160-12*8,250,"NETWORK PLAY");
        this.addChild(t2);
    },
    onenter: function() {
    },
    onenterframe: function() {
    },
    ontouchend: function(e) {
        if (this.t1.y < e.y && e.y < this.t1.y+16) {
            main = new MainScene();
            game.popScene();
            game.pushScene(main);
            return;
        }
        if (this.t2.y < e.y && e.y < this.t2.y+16) {
            robby = new RobbyScene();
            game.popScene();
            game.pushScene(robby);
            return;
        }
    },
});

var waiting = true;
//ロビー用シーン
RobbyScene = enchant.Class.create(enchant.Scene, {
    initialize: function() {
        enchant.Scene.call(this);
        
        this.backgroundColor = 'rgb(0,0,0)';

        var lb = this.label = new Label('Wainting other player.');
        lb.x = 20;
        lb.y = 140;
        lb.color = '#ffffff';
		lb.font = "20px bold";
        lb.time = 0;
        lb.c = 0;
        lb.onenterframe = function() {
            if (waiting) {
                if (connect) {
                    this.text = 'Wainting other player.';
                } else {
                    this.text = 'Connecting server.';
                }
                if (this.time % 45 == 0)this.c++;
                for (var i = 0; i < this.c % 4; i++) {
                    this.text += ' .';
                }
            }
            this.time++;
        }
        this.addChild(lb);
        this.matchingOK = false;
    },
    onenter: function() {
        this.matchingOK = false;
        enterRobby();
    },
    onenterframe: function() {
        if (!waiting && !this.matchingOK) {
            this.label.text = "Here comes a new challenger!";
            versus = true;
            this.matchingOK = true;
            this.label.tl.delay(30).fadeOut(30);
            this.tl.delay(60).then(function(){
                startBattle(sessionID);
                main = new MainScene();
                game.popScene();
                game.pushScene(main);
            });
        }
    },
});

