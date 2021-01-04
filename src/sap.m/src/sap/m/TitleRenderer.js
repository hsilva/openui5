/*!
 * ${copyright}
 */

// Provides default renderer for control sap.m.Title
sap.ui.define(["sap/ui/core/Renderer", "sap/ui/core/library", "sap/m/HyphenationSupport"],
	function(Renderer, coreLibrary, HyphenationSupport) {
	"use strict";

	// shortcut for sap.ui.core.TextDirection
	var TextDirection = coreLibrary.TextDirection;

	// shortcut for sap.ui.core.TitleLevel
	var TitleLevel = coreLibrary.TitleLevel;

	/**
	 * Title renderer.
	 * @namespace
	 */
	var TitleRenderer = {
		apiVersion: 2
	};

	/**
	 * Renders the HTML for the given control, using the provided {@link sap.ui.core.RenderManager}.
	 * @param {sap.ui.core.RenderManager} oRm the RenderManager that can be used for writing to the Render-Output-Buffer
	 * @param {sap.ui.core.Control} oShell an object representation of the control that should be rendered
	 */
	TitleRenderer.render = function(oRm, oTitle){
		var oAssoTitle = oTitle._getTitle(),
			sLevel = (oAssoTitle ? oAssoTitle.getLevel() : oTitle.getLevel()) || TitleLevel.Auto,
			bAutoLevel = sLevel == TitleLevel.Auto,
			sTag = bAutoLevel ? "div" : sLevel.toLowerCase(),
			sText = HyphenationSupport.getTextForRender(oTitle, "main"),
			sTextDir = oTitle.getTextDirection(),
			sTextAlign = Renderer.getTextAlign(oTitle.getTextAlign(), sTextDir);

		oRm.openStart(sTag, oTitle);
		oRm.class("sapMTitle");
		oRm.class("sapMTitleStyle" + oTitle.getTitleStyle());
		oRm.class(oTitle.getWrapping() ? "sapMTitleWrap" : "sapMTitleNoWrap");
		oRm.class("sapUiSelectable");

		var sWidth = oTitle.getWidth();
		if (!sWidth) {
			oRm.class("sapMTitleMaxWidth");
		} else {
			oRm.style("width", sWidth);
		}

		if (sTextAlign) {
			oRm.style("text-align", sTextAlign);
		}

		if (oTitle.getParent() instanceof sap.m.Toolbar) {
			oRm.class("sapMTitleTB");
		}

		var sTooltip = oAssoTitle ? oAssoTitle.getTooltip_AsString() : oTitle.getTooltip_AsString();
		if (sTooltip) {
			oRm.attr("title", sTooltip);
		}

		if (bAutoLevel) {
			oRm.attr("role", "heading");
			oRm.attr("aria-level", oTitle._getAriaLevel());
		}

		HyphenationSupport.writeHyphenationClass(oRm, oTitle);

		oRm.openEnd();
		oRm.openStart("span", oTitle.getId() + "-inner");

		oRm.attr("dir", sTextDir !== TextDirection.Inherit ? sTextDir.toLowerCase() : "auto");

		oRm.openEnd();

		oRm.text(sText);
		oRm.close("span");
		oRm.close(sTag);
	};

	return TitleRenderer;

}, /* bExport= */ true);
