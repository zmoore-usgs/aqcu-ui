/**
 * The saved reports view exists mostly as a button which launches a window for the rest of the view.
 * The rest of the view will use a global Saved Reports service (SavedReportsController) for
 * storing/retreiving saved reports.
 */
AQCU.view.SavedReportsView = AQCU.view.BaseView.extend({
	templateName: 'saved-reports',

	events: {
		"click .saved-report-desc" : "launchReport",
		"click .delete-all-saved-reports" : "deleteAllSavedReports",
		"click .delete-saved-report" : "deleteSavedReport",
		"click .export-saved-report" : "exportSavedReport",
		"click .export-saved-reports" : "exportSavedReports",
		"click .open-all-saved-reports" : "openAll",
		"click .download-all-saved-reports" : "downloadAllAsZip"
	},
	
	initialize: function() {
		AQCU.view.BaseView.prototype.initialize.apply(this, arguments);
		
		this.id = new Date().getMilliseconds();
		this.router = this.options.router;
		this.controller = this.options.controller;
		
		this.model = this.options.model || new Backbone.Model({
				savedReports: this.controller.getSavedReports()
			});
		
		this.model.on("change:savedReports", function() {
			this.render();
			this.flashSaveSuccess();
		}, this);
		
		this.controller.registerModel(this.model);
	},
	
	preRender: function() {
		this.context = {
			id: this.id,
			savedReports : this.model.get("savedReports"),
		};
	},
	
	afterRender: function() {
		this.hideSaveSuccess();
		var _this = this;
		//hook up import button with fileupload plugin
		this.$('.fileupload').fileupload({
			url: AQCU.constants.serviceEndpoint + "/service/echo/upload",
			dataType: 'json',
			done: function (e, data) {
				var openModal = _this.$(".modal");
				openModal.on("hidden.bs.modal", function(){
					AQCU.controller.SavedReportsController.saveAllReports(data.result);
				});
				openModal.modal("hide");
			}
		})
	},
	
	launchReport: function(evt) {
		var index = $(evt.currentTarget).attr("index");
		this.downloadReport(this.model.get("savedReports")[index]);
	},
	
	openAll: function() {
		var reports = this.model.get("savedReports");
		for(var i =0; i < reports.length; i++) {
			this.downloadReport(reports[i]);
		}
	},
	
	downloadReport: function(selectedReport) {
		var requestParams = selectedReport.requestParameters;
		this.router.startDownload(AQCU.constants.serviceEndpoint + "/service/reports/" + 
				selectedReport.reportType + (!selectedReport.format == "html" ? "/download" : ""), requestParams, "");
	},
	
	deleteAllSavedReports : function(evt) {
		evt.stopImmediatePropagation();
		var delButton = $(evt.currentTarget);
		var _this = this;
		delButton.confirmation({
			title: "Delete ALL saved reports?",
			placement: "left",
			onConfirm: function() {
				var openModal = _this.$(".modal");
				openModal.on("hidden.bs.modal", function(){
					AQCU.controller.SavedReportsController.setSavedReports([]);
				});
				openModal.modal("hide");
			},
			btnOkLabel: "Yes",
			btnCancelLabel: "No"
		});
		
		delButton.confirmation("show");
		
	},
	
	deleteSavedReport: function(evt) {
		evt.stopImmediatePropagation();
		var _this = this;
		
		var delButton = $(evt.currentTarget);
		var index = $(evt.currentTarget).attr("index");
		
		delButton.confirmation({
			title: "Delete this saved report?",
			placement: "top",
			onConfirm: function() {
				var openModal = _this.$(".modal");
				openModal.on("hidden.bs.modal", function(){
					AQCU.controller.SavedReportsController.deleteSavedReportAtIndex(index);
				});
				openModal.modal("hide");
			},
			btnOkLabel: "Yes",
			btnCancelLabel: "No"
		});
		
		delButton.confirmation("show");
	},
	
	//export single saved report
	exportSavedReport: function(evt) {
		var index = $(evt.currentTarget).attr("index");
		var allSavedReports = this.model.get("savedReports");
		var thisSavedReport = []
		thisSavedReport.push(allSavedReports[index]);
		this.downloadCliendJson(thisSavedReport);
	}, 
	
	exportSavedReports: function() {
		this.downloadCliendJson(this.model.get("savedReports"));
	},
	
	downloadCliendJson: function(json) {
		var downloadIFrame = $(".exportFrame");
		if(!downloadIFrame.length) {
			this.$el.append($("<iframe>").hide().addClass("exportFrame"))
			downloadIFrame = $(".exportFrame");
		}
		$(downloadIFrame.contents().find("body")).html("<form method='POST' action='" +
				AQCU.constants.serviceEndpoint + "/service/echo/savedreports'><textarea name='json' type='text'>" +
				JSON.stringify(json) +
		"</textarea></form>");
		$(downloadIFrame.contents().find("form")).submit();
	},

	downloadAllAsZip: function() {
		var batchRequestFrame = $(".batchRequestFrame");
		if(!batchRequestFrame.length) {
			this.$el.append($("<iframe>").hide().addClass("batchRequestFrame"))
			batchRequestFrame = $(".batchRequestFrame");
		}
		$(batchRequestFrame.contents().find("body")).html("<form method='POST' action='" +
				AQCU.constants.serviceEndpoint + "/service/batch/reports'><textarea name='json' type='text'>" +
				JSON.stringify(this.model.get("savedReports")) +
		"</textarea></form>");
		$(batchRequestFrame.contents().find("form")).submit();
	},
	
	hideSaveSuccess: function() {
		this.$(".save-success-indicator").hide();
	},
	
	flashSaveSuccess: function() {
		this.$(".save-success-indicator").slideDown().fadeOut(2000, function(){});
	}
});

//Note sure I like registering these helpers here
Handlebars.registerHelper('SavedReportCardStartFirstRow', function(index) {
	return index == 0 ? "<div class='row'>" : "";
});

Handlebars.registerHelper('SavedReportCardStartRow', function(index, length) {
	var endOfRow = ((index + 1) % 4 == 0) && (index < length - 1);
	return endOfRow ? "<div class='row'>" : "";
});

Handlebars.registerHelper('SavedReportCardEndRow', function(index, length) {
	var endOfRow = ((index + 1) % 4 == 0 && index < length) || index == length - 1;
	return endOfRow ? "</div>" : "";
});

Handlebars.registerHelper('SavedReportsHoverText', function(savedReport) {
	var metadata = savedReport.requestMetadata;
	var params = savedReport.requestParameters;
	var hoverText = "Report Parameters\n";
	
	_.each(params, function(val, key) {
		var stringVal = params[key];
		if(metadata[stringVal]) {
			stringVal = metadata[stringVal]
		}
		hoverText += " - " + key + ": " + stringVal + "\n";
	});
	return hoverText;
});

Handlebars.registerHelper('SavedReportsDisplayText', function(savedReport) {
	var metadata = savedReport.requestMetadata;
	var params = savedReport.requestParameters;
	
	var html = "<b><u>" + savedReport.reportName + "</u></b><br/><div class='saved-report-card-description'>" +
	metadata[params.primaryTimeseriesIdentifier] + ", ";
	if(savedReport.requestParameters.lastMonths) {
		html += "Last " + params.lastMonths + " months";
	} else if(params.waterYear) {
		html += "WY" + params.waterYear;
	} else if(params.startDate) {
		html += "From " + params.startDate + " to " + params.endDate;
	}
	html += "</div>"
	return html;
});