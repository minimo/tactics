/*
 * �e�X�g�p�T�[�o�[�v���O����
 */


var app = require('http').createServer(handler)
, io = require('socket.io').listen(app)
, fs = require('fs')

//�|�[�g3000�Ԃ��g��
app.listen(3000);

// index.html��Ԃ�
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

// �Q�[���T�[�o�p�ϐ�

// ���r�[�ɋ��郆�[�U�̔z�� (id : nickname)
var robby = {};

// battleId �̃J�E���^
var _battleId = 0;

// �Q�[���T�[�o����
// �Q�[���T�[�o�ւ̐ڑ����������Ƃ��̃C�x���g���X�i
io.sockets.on('connection', function (socket) {

    console.log("on-connection");

    // �ڑ��������������Ƃ��N���C�A���g�ɒʒm
    socket.emit('connected');

    // �ڑ����r�؂ꂽ�Ƃ��̃C�x���g���X�i���`
    socket.on('disconnect', function () {
        // ���r�[�̔z�񂩂�폜
        delete robby[socket.id];

        // �ڑ����r�؂ꂽ���Ƃ�ʒm
        socket.emit('user disconnected');
    });

    // ���[�U�����r�[�𗣂ꂽ�Ƃ��̃C�x���g���X�i���`
    socket.on('leave robby', function (id) {
        delete robby[socket.id];
        socket.emit('user left');
    });

    // ���r�[�֓���Ƃ��E�߂��Ă����Ƃ��̃C�x���g���X�i���`
    socket.on('enter robby', function (data){
        if(data.nickname){
            // ���r�[�̃��[�U���z��Ƀf�[�^��ǉ�
            robby[socket.id] = data.nickname;
 
            // �N���C�A���g�Ƀ��r�[�ɐڑ��ł������ƂƁA�N���C�A���g��id��ʒm
            socket.emit('robby entered', socket.id);
 
            // �N���C�A���g�Ƀ��r�[�ɂ��郆�[�U��ʒm
            socket.emit('robby info', robby);
 
            // ���̃��[�U�ɁA�ڑ������������Ƃ�ʒm
            socket.broadcast.emit('user joined', { id: socket.id, nickname: data.nickname });
        }
    });
 
    // �o�g���̐\�����݂��������Ƃ��̃C�x���g���X�i���`
    socket.on('battle proposal', function(data, fn){
        if(data.to){
            // �V�����o�g���ɑ΂��ăo�g��ID������U��
            var battleId = _battleId ++;
 
            // �\�����݂����������Ƃ�ʒm
            socket.broadcast.emit('battle proposal', {from: socket.id, to: data.to, battleId: battleId});
 
            // �o�g�����n�߂�
            startBattle(battleId);

            // ����U��ꂽ�o�g��ID���N���C�A���g�ɕԓ�
            fn({battleId : battleId});
        }
    });
 
    // ���r�[�ɂ��郆�[�U�̏������߂�ꂽ�Ƃ��̃C�x���g���X�i
    socket.on('robby info', function (data) {
        // ���r�[�̃��[�U���z���Ԃ�
        socket.emit('robby info', robby);
    });
});
 
// �ʐM�ΐ���n�߂�
function startBattle(battleId){
    // /battle/:battleId �ɑ΂���ڑ���҂��󂯂�C�x���g���X�i
    var battle = io.of('/battle/'+ battleId).on('connection', function(socket){
 
        // �Q�[�����n�߂��|�̒ʒm��broadcast
        socket.on('game start', function(){
            console.log('started');
            socket.broadcast.emit('game start',{});
        });

        // �W�����v�����ʒm��broadcast
        socket.on('jump', function(data){
            console.log('jumped');
            socket.broadcast.emit('jump',{frame: data.frame, score: data.score, voltage: data.voltage});
        });

        // �Q�[���̏󋵂�broadcast
        socket.on('game info', function(data){
            socket.broadcast.emit('game info',{frame: data.frame, score: data.score, voltage: data.voltage});
        });
    });
}
