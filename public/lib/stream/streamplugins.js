/*
 * List of built in plugins for tweet processing
 * 
 */

require.def("stream/streamplugins",
  ["stream/tweet", "stream/twitterRestAPI", "stream/helpers", "text!../templates/tweet.ejs.html"],
  function(tweetModule, rest, helpers, templateText) {
    var template = _.template(templateText);
    
    return {
      
      // turns retweets into something similar to tweets
      handleRetweet: {
        name: "handleRetweet",
        func: function (tweet) {
          if(tweet.data.retweeted_status) {
            var orig = tweet.data;
            tweet.data = tweet.data.retweeted_status;
            tweet.retweet = orig;
          }
          this();
        }
      },
      
      // we only show tweets. No direct messages. For now
      tweetsOnly: {
        name: "tweetsOnly",
        func: function (tweet) {
          if(tweet.data.text != null) {
            this();
          }
        }
      },
      
      // find all mentions in a tweet. set tweet.mentioned to true if the current user was mentioned
      mentions: {
        name: "mentions",
        func: function (tweet, stream) {
          var screen_name = stream.user.screen_name;
          tweet.mentions = [];
          tweet.data.text.replace(/(^|\W)\@([a-zA-Z0-9_]+)/g, function (match, pre, name) {
            if(name == screen_name) {
              tweet.mentioned = true;
            }
            tweet.mentions.push(name);
            return match;
          });
          this();
        }
      },
      
      // set the tweet template
      template: {
        name: "template",
        func: function (tweet) {
          tweet.template = template;
          this();
        }
      },
      
      // render the template (the underscore.js way)
      renderTemplate: {
        name: "renderTemplate",
        func: function (tweet) {
          tweet.html = tweet.template({
            tweet: tweet,
            helpers: helpers
          });
          this();
        }
      },
      
      // put the tweet into the stream
      prepend: {
        name: "prepend",
        func: function (tweet, stream) {
          tweet.node = $(tweet.html);
          tweet.node.data("tweet", tweet); // give node access to its tweet
          stream.canvas().prepend(tweet.node);
          this();
        }
      },
      
      // htmlencode the text to avoid XSS
      htmlEncode: {
        name: "htmlEncode",
        func: function (tweet, stream) {
          var text = tweet.data.text;
          text = helpers.html(text);
          tweet.textHTML = text;
          this();
        }
      },
      
      // calculate the age of the tweet and update it
      // tweet.created_at now includes an actual Date
      age: {
        name: "age",
        func: function (tweet) {
          tweet.created_at = new Date(tweet.data.created_at);
          function update () {
            tweet.age = (new Date()).getTime() - tweet.created_at.getTime();
            tweet.node.find(".created_at").text(Math.round(tweet.age / 1000) + " seconds ago")
          }
          update();
          setInterval(update, 1000)
          this();
        }
      },
      
      // format text to HTML hotlinking, links, things that looks like links, scree names and hash tags
      formatTweetText: {
        name: "formatTweetText",
        func: function (tweet, stream) {
          var text = tweet.textHTML;
          
          // links
          text = text.replace(/https?:\/\/\S+/ig, function (href) {
            return '<a href="'+href+'">'+href+'</a>';
          });
          // www.google.com style links
          text = text.replace(/(^|\s)(www\.\S+)/ig, function (all, pre,www) {
            return pre+'<a href="http://'+www+'">'+www+'</a>';
          });
          // screen names
          text = text.replace(/(^|\W)\@([a-zA-Z0-9_]+)/g, function (all, pre, name) {
            return pre+'<a href="http://twitter.com/'+name+'" class="user-href">@'+name+'</a>';
          });
          // hash tags
          text = text.replace(/(^|\s)\#(\S+)/g, function (all, pre, tag) {
            return pre+'<a href="http://search.twitter.com/search?q='+encodeURIComponent(tag)+'" class="tag">#'+tag+'</a>';
          });
          
          tweet.textHTML = text;
          
          this();
        }
      },
      
      // when we insert a new tweet
      // adjust the scrollTop to show the same thing as before
      // we only do this, if the user was not scrolled to the very top
      keepScrollState: {
        name: "keepScrollState",
        func: function (tweet, stream) {
          var win = $(window);
          var cur = win.scrollTop();
          if(cur != 0) {
            var next = tweet.node.next()
            var top = cur + next.offset().top - tweet.node.offset().top;
            win.scrollTop( top );
          }
          this();
        }
      }
      
    }
      
  }
);