
// Graphight's Stack Evaluation December 2nd 2017

//    ===========================
//  ===                        ===
// ===   Main part of script   ===
//  ===                        ===
//    ===========================

// You are located on the correct tab view
if (document.URL.match(/mode=commands/)) {

    // This section contains all the setup for the pop-up
    let TWDisplay;
    (function() {
        'use strict';
        TWDisplay = {
            MAX_WIDTH: 1300,
            closeCallback: null,
            show: function(id, content, closeCallback, options) {
                options = $.extend({
                    class_name: '',
                    close_from_fader: true
                }, options);
                this.closeCallback = closeCallback;

                // How the pop-up enters
                let fullscreenElement = document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement,
                    container = fullscreenElement || 'body',
                    $container = $('.popup_box_container'),
                    $box, $fader, $content, show_anim = false;
                if (!$container.length) {
                    show_anim = true;
                    $container = $('<div class="popup_box_container" />');
                    $box = $('<div class="popup_box" />').attr('id', 'popup_box_' + id).addClass(options.class_name).data('name', id).appendTo($container);
                    $fader = $('<div class="fader" />').appendTo($container);
                    $content = $('<div class="popup_box_content" />').appendTo($box);
                    $container.appendTo($(container))
                } else {
                    $box = $container.find('.popup_box');
                    if ($box.data('name') !== id) {
                        TWDisplay.close();
                        TWDisplay.show(id, content, closeCallback, options);
                        return
                    }
                    $content = $container.find('.popup_box_content');
                    $box.css('width', 'auto')
                }

                // Content container for the pop-up
                $content.html(content);
                let height_buffer = 125;
                if ($(window).width() < 500 || $(window).height() < $content.height() + height_buffer) {
                    $box.addClass('mobile');
                    $('.popup_box_content').css({
                        'max-height': $(window).height() - (height_buffer / 2) + 'px'
                    })
                }

                // Borders and window section
                let border_width;
                if (typeof window.getComputedStyle === 'function') {
                    border_width = parseInt(getComputedStyle($box[0], null).borderLeftWidth)
                } else border_width = parseInt($box.css('border-left-width'));
                let min_width = 1000,
                    width = Math.min(this.MAX_WIDTH, $content.width(), $(window).width() - border_width);
                if (width < min_width) width = min_width;
                if (!Modernizr.borderimage) width += 20;
                $box.css('width', width + 'px');

                // The close button
                let close_elements = options.close_from_fader ? '.fader, .popup_box_close, .popup_closer' : '.popup_box_close, .popup_closer';
                $container.on('click', close_elements, function() {
                    TWDisplay.close(true);
                    return false
                });
                if (show_anim) setTimeout(function() {
                    $box.addClass('show')
                }, 50);
                UI.init();
                setTimeout(QuestArrows.init, 500)
            },
            close: function(by_user) {
                $('.popup_box_container').remove();
                if (TWDisplay.closeCallback) TWDisplay.closeCallback(by_user);
                inlinePopupClose();
                $('.popup_style').hide();
                QuestArrows.init();
                return false
            },
            fetch: function(name, screen, get_params, callback, TWDisplay_options, closeCallback) {
                TribalWars.get(screen, get_params, function(data) {
                    TWDisplay.show(name, data.TWDisplay, closeCallback, TWDisplay_options);
                    if (callback) callback()
                })
            }
        }
    })();

    // The variables
    let main = $("#commands_table")[0];
    let villages = {};          // Global Dictionary of villages
    let rows = main.getElementsByTagName('tr');
    let total_troops = new Array(6).fill(0);
    let total_farm = 0;

    // Global Constants
    let unit_names = ['Spears', 'Swords', 'Archers', 'Scouts', 'Heavy Cal', 'Paladin'];
    let farm_used = [1, 1, 1, 2, 6, 10];

    // Loop through all of the "row" classes, collecting relevant troop information
    collect_troops_page(villages, rows);

    // Sort the village keys
    let keys = [];
    for (let key in villages) keys.push(key);
    keys.sort();

    // Collect table and summary text
    let data = generate_table(villages, keys, total_troops, total_farm, farm_used);
    let tbl = data[0];
    total_troops = data[1];
    total_farm = data[2];
    let summary = determine_summary(total_troops, total_farm, unit_names);

    console.log(villages);

    // Construct the pop-up
    let content = '<div style=max-width:1000px;>' +
        '<h2 class="popup_box_header"><center><u><font color="green"> Graphight - Support Sent </font></u></center></h2>' +
        '<p><hr><font color=maroon><b><u>Travelling Support</u></b></font></p>' +
        '<p> Sort based on column by clicking the respective header (toggles ascending / descending) </p>' +
        '<p>' + tbl + '</p>' +
        '<p><hr><font color=maroon><b><u>Troop Summary</u></b></font></p>' +
        '<p>' + summary + '</p>' +
        '</div>';

    // Calling the pop-up
    TWDisplay.show('Support_Allocation', content);
    $("#go_man").click(function() {
        window.location.assign(game_data.link_base_pure + "place");
    });
    $("#close_this").click(function() {let close_this = document.getElementsByClassName('popup_box_close'); close_this[0].click();});
}

// Not on correct page so navigate there
else {
    alert("You are not located in the correct directory, I shall move you now. Please run again once you are there");
    self.location = "http://" + window.location.hostname + "/game.php?screen=overview_villages&mode=commands&type=support";
}




//    ===========================
//  ===                        ===
// ===   Function definitions   ===
//  ===                        ===
//    ===========================

function numberWithCommas(x) {

    let parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
}

function collect_troops_page(global_list, data) {

    // Create the local variables
    let current_village;

    for (let i = 0; i < data.length; i++) {
        let cells = data[i].getElementsByTagName('td');

        // Fetch the village coordinates
        if ($(cells[0]).text().match(/Support/) == "Support") {
            current_village = $(cells[0]).text().split(/\(/);
            current_village = current_village[current_village.length - 1];
            current_village = current_village.match(/\d+\|\d+/);
        }

        try {
            // Add to existing array entry for a found villages
            extract_units(global_list, current_village, cells);
        }

        catch(err) {
            // Create a new array entry for a found villages
            global_list[current_village] = new Array(6).fill(0);
            extract_units(global_list, current_village, cells);
        }
    }
}

function extract_units(global_list, current_village, cells) {

    // Create local variables
    let troops_present;
    let index = 0;
    let defence_index = [3, 4, 6, 7, 10, 13];

    // Loop through each troop type
    for (let j = 3; j <= (cells.length - 1); j++) {
        troops_present = cells[j].innerHTML;

        console.log("Troops present =", troops_present);

        if (!troops_present) {
            troops_present = 0;
        }

        if (j === (defence_index[index])) {
            global_list[current_village][index] += parseInt(troops_present);
            index++;
        }
    }
}

function generate_table(global_list, keys, total_troops, total_farm, farm_used) {

    // Create the variables
    let tbl = "<table style='width:100%' id=graphightSupportAllocation>";
    let tblBody = "";
    let icon_source = img_find();

    // Make the header row
    let header_row = "<tr>";
    let cell = "";
    let icon_list = ["Spear fighter", "Swordsman", "Archer", "Scout", "Heavy cavalry", "Paladin"];
    let icon_names = ["Spears", "Swords", "Archers", "Scouts", "Heavies", "Paladin"];
    let header_list = ["Coordinates", "Total pop", "Defensive Villages"];
    let header_index = 0;
    let icon_index = 0;
    for (let j = 0; j <= 8; j++) {
        if ((j < 1) || (j > 6)) {    // A text cell
            cell = "<th onclick='sortTableStrings(" + j + ")'>";
            cell += header_list[header_index];
            header_index ++;
        } else {                    // An troop cell
            cell = "<th onclick='sortTableNumbers(" + j + ")'>";
            let image = "<img src='";
            let icon_name = icon_list[icon_index];
            image += icon_source[icon_name];
            image += "'> ";
            cell += image;
            cell += icon_name;
            icon_index ++;
        }
        cell += "</th>";
        header_row += cell;
    }
    header_row += "</tr>";
    tbl += header_row;

    // creating all cells
    for (let i = 0; i < (keys.length - 1); i++) {

        // creates a table row
        let row = "<tr bgcolor='";
        if ((i % 2) === 1) {
            row += "#f0e2be" + "'>";
        }
        else {
            row += "#fff5da" + "'>";
        }

        let village_name = keys[i];
        let village_troops = 0;
        let troop_index = 0;

        // creates columns
        for (let j = 0; j <= 8; j++) {
            // Create a <td> element and a text node, make the text node the contents of the <td>, and put the <td> at end
            cell = "<td align='center'>";

            // Pretty messy but the table is complicated, feel free to tidy
            if (j === 0) {                                      // Coords
                cell += village_name;
            } else if (j === 7) {                               // Village pop
                cell += village_troops;
                total_farm += village_troops;
            } else if (j === 8) {                               // Defensive Village count
                let dee_vee = (village_troops / parseFloat(20000)).toFixed(3);
                cell += String(dee_vee);
            }
            else {                                              // Unit counts
                let units = global_list[village_name][troop_index];
                village_troops += parseInt(units * farm_used[troop_index]);
                total_troops[troop_index] += units;
                total_farm += parseInt(units * farm_used[troop_index]);
                troop_index ++;
                cell += units;
            }
            cell += "</td>";
            row += cell;
        }

        // Add the row to the end of the table body
        row += "</tr>";
        tblBody += row;
    }

    // put the <tbody> in the <table>
    tblBody += "</table>";
    tbl += tblBody;

    return [tbl, total_troops, total_farm];
}

function determine_summary(total_troops, total_farm, unit_names) {

    let summary = "";

    for (let h = 0; h < 6; h++) {
        summary += unit_names[h] + "= " + numberWithCommas(total_troops[h]) + "<br>";
    }
    let total_deeVees = (parseFloat(total_farm) / parseFloat(20000)).toFixed(3);

    summary += "<br><br>Total farm population: " + numberWithCommas(total_farm) + " or " + total_deeVees + " Defensive Villages<br>";

    return summary;
}

function sortTableNumbers(n) {
    let table;
    let rows;
    let switching;
    let i, x, y;
    let shouldSwitch;
    let dir;
    let switchcount = 0;
    table = document.getElementById("graphightSupportAllocation");
    switching = true;
    // Set the sorting direction to ascending
    dir = "asc";
    // Make a loop that will continue until no switching has been done
    while (switching) {
        // Start by saying: no switching is done:
        switching = false;
        rows = table.getElementsByTagName("TR");
        // Loop through all table rows (except the first, which contains table headers)
        for (i = 1; i < (rows.length - 1); i++) {
            // Start by saying there should be no switching
            shouldSwitch = false;
            // Get the two elements you want to compare, one from current row and one from the next
            x = rows[i].getElementsByTagName("TD")[n];
            y = rows[i + 1].getElementsByTagName("TD")[n];
            // Check if the two rows should switch place, based on the direction, asc or desc
            if (dir === "asc") {
                if (parseFloat(x.innerHTML.toLowerCase()) > parseFloat(y.innerHTML.toLowerCase())) {
                    // If so, mark as a switch and break the loop:
                    shouldSwitch= true;
                    break;
                }
            } else if (dir === "desc") {
                if (parseFloat(x.innerHTML.toLowerCase()) < parseFloat(y.innerHTML.toLowerCase())) {
                    // If so, mark as a switch and break the loop:
                    shouldSwitch= true;
                    break;
                }
            }
        }
        if (shouldSwitch) {
            // If a switch has been marked, make the switch and mark that a switch has been done
            rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
            switching = true;
            // Each time a switch is done, increase this count by 1
            switchcount ++;
        } else {
            // If no switching has been done AND the direction is "asc", set the direction to "desc" and run the while loop again
            if (switchcount === 0 && dir === "asc") {
                dir = "desc";
                switching = true;
            }
        }
    }
    recolour_rows();
}

function sortTableStrings(n) {
    let table;
    let rows;
    let switching;
    let i, x, y;
    let shouldSwitch;
    let dir;
    let switchcount = 0;
    table = document.getElementById("graphightSupportAllocation");
    switching = true;
    // Set the sorting direction to ascending
    dir = "asc";
    // Make a loop that will continue until no switching has been done
    while (switching) {
        // Start by saying: no switching is done:
        switching = false;
        rows = table.getElementsByTagName("TR");
        // Loop through all table rows (except the first, which contains table headers)
        for (i = 1; i < (rows.length - 1); i++) {
            // Start by saying there should be no switching
            shouldSwitch = false;
            // Get the two elements you want to compare, one from current row and one from the next
            x = rows[i].getElementsByTagName("TD")[n];
            y = rows[i + 1].getElementsByTagName("TD")[n];
            // Check if the two rows should switch place, based on the direction, asc or desc
            if (dir === "asc") {
                if (x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()) {
                    // If so, mark as a switch and break the loop:
                    shouldSwitch= true;
                    break;
                }
            } else if (dir === "desc") {
                if (x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase()) {
                    // If so, mark as a switch and break the loop:
                    shouldSwitch= true;
                    break;
                }
            }
        }
        if (shouldSwitch) {
            // If a switch has been marked, make the switch and mark that a switch has been done
            rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
            switching = true;
            // Each time a switch is done, increase this count by 1
            switchcount ++;
        } else {
            // If no switching has been done AND the direction is "asc", set the direction to "desc" and run the while loop again
            if (switchcount === 0 && dir === "asc") {
                dir = "desc";
                switching = true;
            }
        }
    }
    recolour_rows();
}

function recolour_rows() {

    // Define colours
    let odd_colour = '#f0e2be';
    let even_colour = '#fff5da';

    // Collect working information
    let table = document.getElementById("graphightSupportAllocation");
    let rows = table.getElementsByTagName("TR");

    // Loop through and change the colours
    for (let index = 1; index <= (rows.length -1); index++) {
        let row = rows[index];
        if ((index % 2) === 1) {
            row.style.backgroundColor = odd_colour;
        }
        else {
            row.style.backgroundColor = even_colour;
        }
    }

}

function img_find() {
    let imgs = document.getElementsByTagName("img");
    let imgSrcs = {};

    for (let i = 0; i < imgs.length; i++) {
        let title = imgs[i].title;
        imgSrcs[title] = imgs[i].src;
    }

    return imgSrcs;
}