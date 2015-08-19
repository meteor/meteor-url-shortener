// Define a collection to hold our tasks
Urls = new Mongo.Collection("urls");

// Limit it to only MDG employees that have access
var emailDomain = 'meteor.com';
if (Meteor.settings && Meteor.settings.public &&
    Meteor.settings.public.emailDomain) {
  emailDomain = Meteor.settings.public.emailDomain;
}

Accounts.config({
  restrictCreationByEmailDomain: emailDomain
});

if (Meteor.isClient) {
  Meteor.subscribe("urls");

  Template.body.helpers({
    urls: function() {
      return Urls.find({}, {sort: {createdAt: -1}});
    }
  });

  Template.newUrl.helpers({
    fullShortLink: function () {
      return Meteor.absoluteUrl() + 'm/' + this.shortLink;
    }
  });

  Template.body.events({
    'submit .new-url': function (event) {
      event.preventDefault();

      const shortLink = event.target.shortLink.value;
      let longLink = event.target.longLink.value;

      if (!(longLink.startsWith('http://') || longLink.startsWith('https://')))
        longLink = 'http://' + longLink;

      Meteor.call('insertNewUrl', shortLink, longLink);

      event.target.shortLink.value = "";
      event.target.longLink.value = "";
    },

    'click .delete': function () {
      Meteor.call('removeUrl', this._id);
    }
  });
}



if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });

  Meteor.publish("urls", function () {
    return Urls.find();
  });

  Meteor.methods({
    insertNewUrl: function(shortLink, longLink) {
      if (! Meteor.userId()){
        throw new Meteor.Error('not-authorized');
      }

      Urls.upsert({shortLink: shortLink}, {
        shortLink,
        longLink,
        createdAt: new Date(),
        userId: Meteor.userId(),
        name: Meteor.user().name
      });
    },

    removeUrl: function(id) {
      var url = Urls.findOne(id);

      if (url.userId !== Meteor.userId())
        throw new Meteor.Error('not-authorized');

      Urls.remove(id);
    }
  });

  Picker.route('/m/:url', function(params, req, res, next) {
    const specifiedUrl = Urls.find({shortLink: params.url}).fetch()[0];
    if (specifiedUrl) {
      res.writeHead(301, {Location: specifiedUrl.longLink});
      res.end();
    } else {
      res.writeHead(301, {Location: Meteor.absoluteUrl()});
      res.end();
    }
  });
}