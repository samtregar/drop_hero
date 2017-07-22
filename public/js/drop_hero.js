function DropHero(episode) {
    var drop_url = 'eps/' + episode + '.json';
    var pod;
    var buttons_showing = false;
    
    // how long before and after a drop to show the buttons
    var SHOW_BUTTON_DUR = 5;
    
    // pressing the right button within this number of seconds is a hit
    var TARGET_LENGTH = 3;

    $(document).ajaxError(function(event, request, settings){
        window.console && console.log(["AJAX Error", event, request]);
    });
    
    // load up drops and pod mp3 async-like
    var drops, drop_index, next_drop;
    var all_drops = [];
    $.getJSON(drop_url,
              {},
              function(data) {
                  drops = data['drops'];
                  drop_index = 0;
                  next_drop = drops[drop_index];

                  // collect all drops and alts for use as dummy answers
                  for(var i = 0; i < drops.length; i++) {
                      all_drops.push(drops[i]['drop']);
                      if (drops[i]['alts']) {
                          all_drops.push.apply(all_drops, drops[i]['alts']);
                      }
                  }
                  
                  pod = new Howl({
                      'src': [data['mp3']],
                      'html5': true
                  });
              });
    
    var progressbar = $( "#progressbar" );
    var progressLabel = $( ".progress-label" );
 
    this.fmt_seconds = function(sec_num) {
        var hours   = Math.floor(sec_num / 3600);
        var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
        var seconds = parseInt(sec_num) - (hours * 3600) - (minutes * 60);
        
        if (hours   < 10) {hours   = "0"+hours;}
        if (minutes < 10) {minutes = "0"+minutes;}
        if (seconds < 10) {seconds = "0"+seconds;}
        return hours+':'+minutes+':'+seconds;
    };

    // from https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
    this.shuffle = function (array) {
        var currentIndex = array.length, temporaryValue, randomIndex;
        while (0 !== currentIndex) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;
            temporaryValue = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temporaryValue;
        }
        return array;
    };

    this.unique = function(input) {
        var o = {}, a = [];
        for (var i = 0; i < input.length; i++) o[input[i]] = 1;
        for (var e in o) a.push(e);
        return a;
    }
    
    this.do_tick = function() {
        var dur = pod.duration();
        var pos = pod.seek();
        if (dur && pod) {
            progressbar.progressbar({ 'value': (pos / dur) * 100 });
        }

        dist = Math.abs(pos - next_drop['at']);
        console.log(["DIST", pos, next_drop['at'], dist]);
        if (dist <= SHOW_BUTTON_DUR && !buttons_showing) {
            this.show_buttons();
        } 
        if (buttons_showing && dist > SHOW_BUTTON_DUR) {
            this.hide_buttons();
        }
        if (pos > next_drop['at']) {
            drop_index += 1;
            if (drop_index < drops.length) {
                next_drop = drops[drop_index];
            } else {
                next_drop = false;
            }
        }
    };

    this.show_buttons = function() {
        var choices = [next_drop['drop']];
        if (next_drop['alts']) {
            choices.push.apply(choices, next_drop['alts']);
        }

        if (choices.length < 4) {
            extra = this.unique(this.shuffle(all_drops));
            extra = extra.filter( function( el ) {
                return choices.indexOf( el ) < 0;
            });

            for(var i = choices.length; i < 4; i++) {
                choices.push(extra.pop());
            }
        }
        
        choices = this.shuffle(choices);
        for(var i = 0; i < choices.length; i++) {
            $('#button_' + i).html(choices[i]);
        }

        $('.buttons').show();
        buttons_showing = true;
    };

    this.hide_buttons = function() {
        $('.buttons').hide();
        buttons_showing = false;        
    };

    this.start_game = function() {
        var self = this;

        // is this the right way to do this?!  Seems to work...
        if (!this.ready()) {
            setTimeout(function() { self.start_game() }, 500);
            return;
        }

        pod.play();

        progressbar.progressbar({
            value: false,
            change: function() {
                var dur = pod.duration();
                var pos = pod.seek();
                var text = self.fmt_seconds(pod.seek()) + ' of ' +
                           self.fmt_seconds(pod.duration());
                progressLabel.text(text);
            },
            complete: function() {
                progressLabel.text( "Complete!" );
            }
        });

        setInterval(
            (function (self) {
                return function() { self.do_tick() }
            })(this), 500);
    };

    this.pause = function() { pod.pause() };
    this.play = function() { pod.play() };
    this.vol_up = function() { pod.volume(pod.volume() + 0.1) };
    this.vol_down = function() { pod.volume(pod.volume() - 0.1) };            

    this.ready = function () {
        // wait for the Howl object to get loaded, when it's defined
        // we're ready to go
        if (pod) {
            return true;
        } else {
            return false;
        }
    };
}
