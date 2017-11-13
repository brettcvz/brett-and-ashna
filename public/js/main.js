$(function(){
  new WOW({
    mobile: false,
    live: false,
  }).init();

  var carousel = $("#carousel");
  carousel.slick({
    autoplay: true,
    dots: true,
    lazyLoad: "progressive",
  });
  carousel.on("lazyLoaded", function(){
    carousel.css("height", $(window).width() * 0.666);
  });
  $(window).resize(function(){
    carousel.css("height", $(window).width() * 0.666);
  });
  $.modal.defaults.fadeDuration = 200;

  $("#rsvp-form .button-group button").click(function(){
    $(this).siblings().removeClass("selected");
    $(this).addClass("selected");
  });

  $("#rsvp-form .yes-no button").click(function(){
    $("#rsvp-form #submit").removeClass("disabled");
    var rsvp = $("#rsvp-form .yes-no .selected").attr("name");
    if (rsvp === "yes") {
      $("#rsvp-form .additional-info").show();
    } else {
      $("#rsvp-form .additional-info").hide();
    }
  });

  var nameLookup = $("#lookup-name");
  var selectedPerson;
  nameLookup.easyAutocomplete({
    url: function(phrase) {
      if (phrase.length < 5) {
        return;
      }
      return "/api/guests?search="+phrase;
    },
    placeholder: "Please enter your name to look up your reservation",
    getValue: "name",
    listLocation: "items",
    matchResponseProperty: "search",
    list: {
      match: { enabled: true },
      maxNumberOfElements: 3,
      onChooseEvent: function(){
        selectedPerson = nameLookup.getSelectedItemData();
        var nameString = selectedPerson.name;
        if (selectedPerson.additionalGuests === 1) {
          nameString += " and Guest";
        } else if (selectedPerson.additionalGuests > 1) {
          nameString += " and Guests";
        }

        if (selectedPerson.additionalGuests >= 1) {
          $("#rsvp-form .yes-no button[name='yes']").text("Yes, we will attend");
          $("#rsvp-form .yes-no button[name='no']").text("No, we can't make it");
        }
        $("#rsvp-form .name").text(nameString);
        var partyNames = $("#rsvp-form .party-names");
        for (var i=0; i < selectedPerson.additionalGuests; i++) {
          var placeholder = (selectedPerson.additionalGuests === 1) ?
            "Name of guest" : "Name of guest "+(i+1);
          partyNames.append("<input placeholder='"+placeholder+"'/>");
        }

        $("#lookup-form").hide();
        $("#rsvp-form").show();
      }
    }
  });

  $("#rsvp-form #submit").click(function(){
    if ($(this).hasClass("disabled")) {
      return;
    }
    var rsvp = $("#rsvp-form .yes-no .selected").attr("name");
    var guestNames = "";
    if (selectedPerson.additionalGuests > 0) {
      guestNames = $("#rsvp-form .party-names input").get().map(function(guest){
        return guest.value;
      }).join(", ");
    }
    var groupTrip = $("#rsvp-form .travel-plans button.selected").attr("name");
    var notes = $("#rsvp-form #notes").val();

    $.post("/api/rsvp", {
      rsvp: rsvp,
      guestNames: rsvp === "yes" ? guestNames : "",
      groupTrip: rsvp === "yes" ? groupTrip : "",
      notes: notes,
      row: selectedPerson.row,
      code: selectedPerson.code,
    });

    $("#rsvp-form").hide();
    $("#thanks").show();
    $("#thanks p."+rsvp).show();
  });
});
