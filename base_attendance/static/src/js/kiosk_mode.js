/* Copyright (c) 2004-2018 Odoo S.A.
   Copyright 2018 Kolushov Alexandr <https://it-projects.info/team/KolushovAlexandr>
   License LGPL-3.0 or later (http://www.gnu.org/licenses/lgpl.html). */
odoo.define('base_attendance.kiosk_mode', function (require) {
"use strict";

var AbstractAction = require('web.AbstractAction');
var ajax = require('web.ajax');
var core = require('web.core');
var Session = require('web.session');

var QWeb = core.qweb;

var KioskMode = AbstractAction.extend({
    events: {
        "click .o_hr_attendance_button_partners": function(){
            this.do_action('base_attendance.res_partner_action_kanban_view');
        },
    },

    start: function () {
        var self = this;
        core.bus.on('barcode_scanned', this, this._onBarcodeScanned);
        self.session = Session;
        var def = this._rpc({
                model: 'res.company',
                method: 'search_read',
                args: [[['id', '=', this.session.company_id]], ['name']],
            }).then(function (companies){
                self.company_name = companies[0].name;
                self.company_image_url = self.session.url('/web/image', {model: 'res.company', id: self.session.company_id, field: 'logo',});
                self.$el.html(QWeb.render("BaseAttendanceKioskMode", {widget: self}));
                self.start_clock();
            });
        // Make a RPC call every day to keep the session alive
        self._interval = window.setInterval(this._callServer.bind(this), (60*60*1000*24));
        return $.when(def, this._super.apply(this, arguments));
    },

    _onBarcodeScanned: function(barcode) {
        var self = this;
        this._rpc({
                model: 'res.partner',
                method: 'attendance_scan',
                args: [barcode, ],
            }).then(function (result) {
                if (result.action) {
                    self.do_action(result.action);
                } else if (result.warning) {
                    self.do_warn(result.warning);
                }
            });
    },

    start_clock: function() {
        this.clock_start = setInterval(function() {
            this.$(".o_hr_attendance_clock").text(new Date().toLocaleTimeString(navigator.language, {hour: '2-digit', minute:'2-digit'}));
        }, 700);
        // First clock refresh before interval to avoid delay
        this.$(".o_hr_attendance_clock").text(new Date().toLocaleTimeString(navigator.language, {hour: '2-digit', minute:'2-digit'}));
    },

    destroy: function () {
        core.bus.off('barcode_scanned', this, this._onBarcodeScanned);
        clearInterval(this.clock_start);
        clearInterval(this._interval);
        this._super.apply(this, arguments);
    },

    _callServer: function () {
        // Make a call to the database to avoid the auto close of the session
        return ajax.rpc("/web/webclient/version_info", {});
    },

});

core.action_registry.add('base_attendance_kiosk_mode', KioskMode);

return KioskMode;

});
