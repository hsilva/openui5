/*!
 * ${copyright}
 */

sap.ui.define([
	"jquery.sap.global",
	"./_Helper",
	"./_MetadataConverter"
], function (jQuery, _Helper, _MetadataConverter) {
	"use strict";

	var sEdmxNamespace = "http://docs.oasis-open.org/odata/ns/edmx",
		V4MetadataConverter,
		// All Annotations elements that don't have expressions as child (leaf, non-recursive)
		oAnnotationLeafConfig = {
			"AnnotationPath" : {__postProcessor : postProcessLeaf},
			"Binary" : {__postProcessor : postProcessLeaf},
			"Bool" : {__postProcessor : postProcessLeaf},
			"Date" : {__postProcessor : postProcessLeaf},
			"DateTimeOffset" : {__postProcessor : postProcessLeaf},
			"Decimal" : {__postProcessor : postProcessLeaf},
			"Duration" : {__postProcessor : postProcessLeaf},
			"EnumMember" : {__postProcessor : postProcessLeaf},
			"Float" : {__postProcessor : postProcessLeaf},
			"Guid" : {__postProcessor : postProcessLeaf},
			"Int" : {__postProcessor : postProcessLeaf},
			"LabeledElementReference" : {__postProcessor : postProcessLabeledElementReference},
			"NavigationPropertyPath" : {__postProcessor : postProcessLeaf},
			"Path" : {__postProcessor : postProcessLeaf},
			"PropertyPath" : {__postProcessor : postProcessLeaf},
			"String" : {__postProcessor : postProcessLeaf},
			"TimeOfDay" : {__postProcessor : postProcessLeaf}
		},
		// When oAnnotationExpressionConfig is defined, it is added to this array for the recursion
		aExpressionInclude = [oAnnotationLeafConfig],
		oAnnotationConfig = {
			"Annotation" : {
				__processor : processAnnotation,
				__postProcessor : postProcessAnnotation,
				__include : aExpressionInclude
			}
		},
		aAnnotatableExpressionInclude = [oAnnotationLeafConfig, oAnnotationConfig],
		oOperatorConfig = {
			__processor : processAnnotatableExpression,
			__postProcessor : postProcessOperation,
			__include : aAnnotatableExpressionInclude
		},
		oAnnotationExpressionConfig = {
			"And" : oOperatorConfig,
			"Apply" : {
				__processor : processAnnotatableExpression,
				__postProcessor : postProcessApply,
				__include : aAnnotatableExpressionInclude
			},
			"Cast" : {
				__processor : processAnnotatableExpression,
				__postProcessor : postProcessCastOrIsOf,
				__include : aAnnotatableExpressionInclude
			},
			"Collection" : {
				__postProcessor : postProcessCollection,
				__include : aExpressionInclude
			},
			"Eq" : oOperatorConfig,
			"Ge" : oOperatorConfig,
			"Gt" : oOperatorConfig,
			"If" : oOperatorConfig,
			"IsOf" : {
				__processor : processAnnotatableExpression,
				__postProcessor : postProcessCastOrIsOf,
				__include : aAnnotatableExpressionInclude
			},
			"LabeledElement" : {
				__processor : processAnnotatableExpression,
				__postProcessor : postProcessLabeledElement,
				__include : aAnnotatableExpressionInclude
			},
			"Le" : oOperatorConfig,
			"Lt" : oOperatorConfig,
			"Ne" : oOperatorConfig,
			"Null" : {
				__processor : processAnnotatableExpression,
				__postProcessor : postProcessNull,
				__include : [oAnnotationConfig]
			},
			"Not" : {
				__processor : processAnnotatableExpression,
				__postProcessor : postProcessNot,
				__include : aAnnotatableExpressionInclude
			},
			"Or" : oOperatorConfig,
			"Record" : {
				__processor : processAnnotatableExpression,
				__postProcessor : postProcessRecord,
				__include : [oAnnotationConfig],
				"PropertyValue" : {
					__processor : processPropertyValue,
					__postProcessor : postProcessPropertyValue,
					__include : aAnnotatableExpressionInclude
				}
			},
			"UrlRef" : {
				__postProcessor : postProcessUrlRef,
				__include : aExpressionInclude
			}
		},
		oAliasConfig = {
			"Reference" : {
				"Include" : {__processor : _MetadataConverter.processAlias}
			},
			"DataServices" : {
				"Schema" : {__processor : _MetadataConverter.processAlias}
			}
		},
		oStructuredTypeConfig = {
			"Property" : {
				__processor : processTypeProperty,
				__include : [oAnnotationConfig]
			},
			"NavigationProperty" : {
				__processor : processTypeNavigationProperty,
				__include : [oAnnotationConfig],
				"OnDelete" : {
					__processor : processTypeNavigationPropertyOnDelete,
					__include : [oAnnotationConfig]
				},
				"ReferentialConstraint" : {
					__processor : processTypeNavigationPropertyReferentialConstraint,
					__include : [oAnnotationConfig]
				}
			}
		},
		oEntitySetConfig = {
			"NavigationPropertyBinding" : {
				__processor : processNavigationPropertyBinding
			}
		},
		oActionOrFunctionConfig = {
			"Parameter" : {
				__processor : processParameter,
				__include : [oAnnotationConfig]
			},
			"ReturnType" : {
				__processor : processReturnType,
				__include : [oAnnotationConfig]
			}
		},
		oFullConfig = {
			__processor : processEdmx,
			"Reference" : {
				__processor : processReference,
				__include : [oAnnotationConfig],
				"Include" : {
					__processor : processInclude
				},
				"IncludeAnnotations" : {
					__processor : processIncludeAnnotations
				}
			},
			"DataServices" : {
				"Schema" : {
					__processor : _MetadataConverter.processSchema,
					__include : [oAnnotationConfig],
					"Action" : {
						__processor : processActionOrFunction,
						__include : [oActionOrFunctionConfig, oAnnotationConfig]
					},
					"Annotations" : {
						__processor : processAnnotations,
						__include : [oAnnotationConfig]
					},
					"Function" : {
						__processor : processActionOrFunction,
						__include : [oActionOrFunctionConfig, oAnnotationConfig]
					},
					"EntityType" : {
						__processor : processEntityType,
						__include : [oStructuredTypeConfig, oAnnotationConfig],
						"Key" : {
							"PropertyRef" : {
								__processor : processEntityTypeKeyPropertyRef
							}
						}
					},
					"ComplexType" : {
						__processor : processComplexType,
						__include : [oStructuredTypeConfig, oAnnotationConfig]
					},
					"EntityContainer" : {
						__processor : processEntityContainer,
						__include : [oAnnotationConfig],
						"ActionImport" : {
							__processor : processImport.bind(null, "Action"),
							__include : [oAnnotationConfig]
						},
						"EntitySet" : {
							__processor : processEntitySet,
							__include : [oEntitySetConfig, oAnnotationConfig]
						},
						"FunctionImport" : {
							__processor : processImport.bind(null, "Function"),
							__include : [oAnnotationConfig]
						},
						"Singleton" : {
							__processor : processSingleton,
							__include : [oEntitySetConfig, oAnnotationConfig]
						}
					},
					"EnumType" : {
						__processor : processEnumType,
						__include : [oAnnotationConfig],
						"Member" : {
							__processor : processEnumTypeMember,
							__include : [oAnnotationConfig]
						}
					},
					"Term" : {
						__processor : processTerm,
						__include : [oAnnotationConfig]
					},
					"TypeDefinition" : {
						__processor : processTypeDefinition,
						__include : [oAnnotationConfig]
					}
				}
			}
		};

	// enable the recursion
	aExpressionInclude.push(oAnnotationExpressionConfig);
	aAnnotatableExpressionInclude.push(oAnnotationExpressionConfig);
	// yet another recursion: annotated Annotation
	oAnnotationConfig.Annotation.Annotation = oAnnotationConfig.Annotation;

	/**
	 * Determines the value for an annotation of the given type.
	 * @param {string} sType
	 *   The annotation type (either from the attribute name in the Annotation element or from the
	 *   element name itself)
	 * @param {string} sValue
	 *   The value in the XML (either the attribute value or the element's text value)
	 * @param {object} oAggregate
	 *   The aggregate
	 * @returns {any}
	 *   The value for the JSON
	 */
	function getAnnotationValue(sType, sValue, oAggregate) {
		var i, vValue, aValues;

		switch (sType) {
			case "AnnotationPath":
			case "NavigationPropertyPath":
			case "Path":
			case "PropertyPath":
				sValue = V4MetadataConverter.resolveAliasInPath(sValue, oAggregate);
				// falls through
			case "Binary":
			case "Date":
			case "DateTimeOffset":
			case "Decimal":
			case "Duration":
			case "Guid":
			case "TimeOfDay":
			case "UrlRef":
				vValue = {};
				vValue["$" + sType] = sValue;
				return vValue;
			case "Bool":
				return sValue === "true";
			case "EnumMember":
				aValues = sValue.trim().replace(/ +/g, " ").split(" ");
				for (i = 0; i < aValues.length; i++) {
					aValues[i] = V4MetadataConverter.resolveAliasInPath(aValues[i], oAggregate);
				}
				return {$EnumMember : aValues.join(" ")};
			case "Float":
				if (sValue === "NaN" || sValue === "INF" || sValue === "-INF") {
					return {$Float : sValue};
				}
				return parseFloat(sValue);
			case "Int":
				vValue = parseInt(sValue, 10);
				return _Helper.isSafeInteger(vValue) ? vValue : {$Int : sValue};
			case "String":
				return sValue;
			default:
				return undefined;
		}
	}

	/**
	 * Determines the value for an inline annotation in the element.
	 *
	 * @param {Element} oElement The element
	 * @param {object} oAggregate
	 *   The aggregate
	 * @returns {any}
	 *   The value for the JSON
	 */
	function getInlineAnnotationValue(oElement, oAggregate) {
		var oAttribute,
			oAttributeList = oElement.attributes,
			i,
			vValue;

		// check the last attribute first, this is typically the one with the annotation value
		for (i = oAttributeList.length - 1; i >= 0; i--) {
			oAttribute = oAttributeList.item(i);
			vValue = getAnnotationValue(oAttribute.name, oAttribute.value, oAggregate);
			if (vValue !== undefined) {
				return vValue;
			}
		}
		return true;
	}

	/**
	 * Post-processing of an Annotation element. Sets the result of the single child element at the
	 * annotation if there was a child.
	 *
	 * @param {Element} oElement The element
	 * @param {any[]} aResult The results from child elements
	 * @param {object} oAggregate The aggregate
	 */
	function postProcessAnnotation(oElement, aResult, oAggregate) {
		// oAggregate.annotatable is the Annotation itself currently.
		var oAnnotatable = oAggregate.annotatable.parent;

		oAnnotatable.target[oAnnotatable.qualifiedName] =
			aResult.length ? aResult[0] : getInlineAnnotationValue(oElement, oAggregate);
	}

	/**
	 * Post-processing of an Apply element.
	 *
	 * @param {Element} oElement The element
	 * @param {any[]} aResult The results from child elements
	 * @param {object} oAggregate The aggregate
	 * @returns {object} The value for the JSON
	 */
	function postProcessApply(oElement, aResult, oAggregate) {
		var oResult = oAggregate.annotatable.target;

		oResult.$Apply = aResult;
		oResult.$Function =
			V4MetadataConverter.resolveAlias(oElement.getAttribute("Function"), oAggregate);
		return oResult;
	}

	/**
	 * Post-processing of a Cast or IsOf element.
	 *
	 * @param {Element} oElement The element
	 * @param {any[]} aResult The results from child elements
	 * @param {object} oAggregate The aggregate
	 * @returns {object} The value for the JSON
	 */
	function postProcessCastOrIsOf(oElement, aResult, oAggregate) {
		var sName = oElement.localName,
			oResult = oAggregate.annotatable.target;

		oResult["$" + sName] = aResult[0];
		processTypedCollection(oElement.getAttribute("Type"), oResult, oAggregate);
		V4MetadataConverter.processFacetAttributes(oElement, oResult);
		return oResult;
	}

	/**
	 * Post-processing of a Collection element.
	 *
	 * @param {Element} oElement The element
	 * @param {any[]} aResult The results from child elements
	 * @param {object} oAggregate The aggregate
	 * @returns {object} The value for the JSON
	 */
	function postProcessCollection(oElement, aResult, oAggregate) {
		return aResult;
	}

	/**
	 * Post-processing of a LabeledElement element within an Annotation element.
	 *
	 * @param {Element} oElement The element
	 * @param {any[]} aResult The results from child elements
	 * @param {object} oAggregate The aggregate
	 * @returns {any} The value for the JSON
	 */
	function postProcessLabeledElement(oElement, aResult, oAggregate) {
		var oResult = oAggregate.annotatable.target;

		oResult.$LabeledElement = aResult.length ? aResult[0] :
			getInlineAnnotationValue(oElement, oAggregate);
		oResult.$Name = oElement.getAttribute("Name");
		return oResult;
	}

	/**
	 * Post-processing of a LabeledElementReference element within an Annotation element.
	 *
	 * @param {Element} oElement The element
	 * @param {any[]} aResult The results from child elements
	 * @param {object} oAggregate The aggregate
	 * @returns {any} The value for the JSON
	 */
	function postProcessLabeledElementReference(oElement, aResult, oAggregate) {
		return {
			"$LabeledElementReference" :
				V4MetadataConverter.resolveAlias(oElement.textContent, oAggregate)
		};
	}

	/**
	 * Post-processing of a leaf element within an Annotation element.
	 *
	 * @param {Element} oElement The element
	 * @param {any[]} aResult The results from child elements
	 * @param {object} oAggregate The aggregate
	 * @returns {any} The constant value for the JSON
	 */
	function postProcessLeaf(oElement, aResult, oAggregate) {
		return getAnnotationValue(oElement.localName, oElement.textContent, oAggregate);
	}

	/**
	 * Post-processing of a Not element within an Annotation element.
	 *
	 * @param {Element} oElement The element
	 * @param {any[]} aResult The results from child elements
	 * @param {object} oAggregate The aggregate
	 * @returns {object} The value for the JSON
	 */
	function postProcessNot(oElement, aResult, oAggregate) {
		var oResult = oAggregate.annotatable.target;

		oResult.$Not = aResult[0];
		return oResult;
	}

	/**
	 * Post-processing of a Null element within an Annotation element.
	 *
	 * @param {Element} oElement The element
	 * @param {any[]} aResult The results from child elements
	 * @param {object} oAggregate The aggregate
	 * @returns {object} The value for the JSON
	 */
	function postProcessNull(oElement, aResult, oAggregate) {
		var oAnnotatable = oAggregate.annotatable,
			vResult = null;

		if (oAnnotatable.qualifiedName) {
			vResult = oAnnotatable.target;
			vResult.$Null = null;
		}
		return vResult;
	}

	/**
	 * Post-processing of a PropertyValue element within a Record element.
	 *
	 * @param {Element} oElement The element
	 * @param {any[]} aResult The results from child elements
	 * @param {object} oAggregate The aggregate
	 * @returns {any} The value for the JSON
	 */
	function postProcessPropertyValue(oElement, aResult, oAggregate) {
		return {
			property : oElement.getAttribute("Property"),
			value : aResult.length ? aResult[0] :
				getInlineAnnotationValue(oElement, oAggregate)
		};
	}

	/**
	 * Post-processing of a Record element within an Annotation element.
	 *
	 * @param {Element} oElement The element
	 * @param {any[]} aResult The results from child elements
	 * @param {object} oAggregate The aggregate
	 * @returns {object} The value for the JSON
	 */
	function postProcessRecord(oElement, aResult, oAggregate) {
		var i,
			oPropertyValue,
			oResult = oAggregate.annotatable.target,
			oType = oElement.getAttribute("Type");

		if (oType) {
			oResult.$Type = V4MetadataConverter.resolveAlias(oType, oAggregate);
		}
		for (i = 0; i < aResult.length; i++) {
			oPropertyValue = aResult[i];
			oResult[oPropertyValue.property] = oPropertyValue.value;
		}
		return oResult;
	}

	/**
	 * Post-processing of an operation element (And, Or, Eq etc) within an Annotation element.
	 *
	 * @param {Element} oElement The element
	 * @param {any[]} aResult The results from child elements
	 * @param {object} oAggregate The aggregate
	 * @returns {object} The value for the JSON
	 */
	function postProcessOperation(oElement, aResult, oAggregate) {
		var oResult = oAggregate.annotatable.target;

		oResult["$" + oElement.localName] = aResult;
		return oResult;
	}

	/**
	 * Post-processing of a UrlRef element within an Annotation element.
	 *
	 * @param {Element} oElement The element
	 * @param {any[]} aResult The results from child elements
	 * @returns {object} The constant value for the JSON
	 */
	function postProcessUrlRef(oElement, aResult) {
		return {$UrlRef : aResult[0]};
	}

	/**
	 * Processes an Action or Function element.
	 * @param {Element} oElement The element
	 * @param {object} oAggregate The aggregate
	 */
	function processActionOrFunction(oElement, oAggregate) {
		var sKind = oElement.localName,
			sQualifiedName = oAggregate.namespace + oElement.getAttribute("Name"),
			oAction = {
				$kind : sKind
			};

		 V4MetadataConverter.processAttributes(oElement, oAction, {
			"IsBound" : V4MetadataConverter.setIfTrue,
			"EntitySetPath" : V4MetadataConverter.setValue,
			"IsComposable" : V4MetadataConverter.setIfTrue
		});

		V4MetadataConverter.getOrCreateArray(oAggregate.result, sQualifiedName).push(oAction);
		oAggregate.actionOrFunction = oAction;
		V4MetadataConverter.annotatable(oAggregate, oAction);
	}

	/**
	 * Processes an element of an annotatable expression.
	 * @param {Element} oElement The element
	 * @param {object} oAggregate The aggregate
	 */
	function processAnnotatableExpression(oElement, oAggregate) {
		V4MetadataConverter.annotatable(oAggregate, {});
	}

	/**
	 * Processes an Annotations element.
	 * @param {Element} oElement The element
	 * @param {object} oAggregate The aggregate
	 */
	function processAnnotations(oElement, oAggregate) {
		V4MetadataConverter.annotatable(oAggregate,
			V4MetadataConverter.resolveAliasInPath(oElement.getAttribute("Target"), oAggregate),
			undefined, // no prefix
			oElement.getAttribute("Qualifier"));
	}

	/**
	 * Processes an Annotation element within Annotations.
	 * @param {Element} oElement The element
	 * @param {object} oAggregate The aggregate
	 */
	function processAnnotation(oElement, oAggregate) {
		var oAnnotatable = oAggregate.annotatable,
			oAnnotations,
			sQualifiedName = oAnnotatable.prefix + "@"
				+ V4MetadataConverter.resolveAlias(oElement.getAttribute("Term"), oAggregate),
			// oAnnotatable.qualifier can only come from <Annotations>. If such a qualifier is set
			// <Annotation> itself MUST NOT supply a qualifier. (see spec Part 3, 14.3.2)
			sQualifier = oAnnotatable.qualifier || oElement.getAttribute("Qualifier");

		if (sQualifier) {
			sQualifiedName += "#" + sQualifier;
		}

		if (typeof oAnnotatable.target === "string") {
			oAnnotations = V4MetadataConverter.getOrCreateObject(oAggregate.schema, "$Annotations");
			oAnnotatable.target = oAnnotations[oAnnotatable.target] = {};
		}

		oAnnotatable.qualifiedName = sQualifiedName;
		// do not calculate a value yet, this is done in postProcessAnnotation
		oAnnotatable.target[sQualifiedName] = true;
		V4MetadataConverter.annotatable(oAggregate, oAnnotatable.target, sQualifiedName);
	}

	/**
	 * Processes a ComplexType element.
	 * @param {Element} oElement The element
	 * @param {object} oAggregate The aggregate
	 */
	function processComplexType(oElement, oAggregate) {
		processType(oElement, oAggregate, {"$kind" : "ComplexType"});
	}

	/**
	 * Processes the Edmx element.
	 * @param {Element} oElement The element
	 * @param {object} oAggregate The aggregate
	 */
	function processEdmx(oElement, oAggregate) {
		V4MetadataConverter.processAttributes(oElement, oAggregate.result, {
			"Version" : V4MetadataConverter.setValue
		});
	}

	/**
	 * Processes an EntityContainer element.
	 * @param {Element} oElement The element
	 * @param {object} oAggregate The aggregate
	 */
	function processEntityContainer(oElement, oAggregate) {
		var sQualifiedName = oAggregate.namespace + oElement.getAttribute("Name");

		oAggregate.result[sQualifiedName] = oAggregate.entityContainer = {
			"$kind" : "EntityContainer"
		};
		oAggregate.result.$EntityContainer = sQualifiedName;
		V4MetadataConverter.annotatable(oAggregate, sQualifiedName);
	}

	/**
	 * Processes an EntitySet element at the EntityContainer.
	 * @param {Element} oElement The element
	 * @param {object} oAggregate The aggregate
	 */
	function processEntitySet(oElement, oAggregate) {
		var sName = oElement.getAttribute("Name");

		oAggregate.entityContainer[sName] = oAggregate.entitySet = {
			$kind : "EntitySet",
			$Type :
				V4MetadataConverter.resolveAlias(oElement.getAttribute("EntityType"), oAggregate)
		};
		 V4MetadataConverter.processAttributes(oElement, oAggregate.entitySet, {
			"IncludeInServiceDocument" : V4MetadataConverter.setIfFalse
		});
		V4MetadataConverter.annotatable(oAggregate, sName);
	}

	/**
	 * Processes an EntityType element.
	 * @param {Element} oElement The element
	 * @param {object} oAggregate The aggregate
	 */
	function processEntityType(oElement, oAggregate) {
		processType(oElement, oAggregate, {
			$kind : "EntityType"
		});
	}

	/**
	 * Processes a PropertyRef element of the EntityType's Key.
	 * @param {Element} oElement The element
	 * @param {object} oAggregate The aggregate
	 */
	function processEntityTypeKeyPropertyRef(oElement, oAggregate) {
		var sAlias = oElement.getAttribute("Alias"),
			vKey,
			sName = oElement.getAttribute("Name");

		if (sAlias) {
			vKey = {};
			vKey[sAlias] = sName;
		} else {
			vKey = sName;
		}
		V4MetadataConverter.getOrCreateArray(oAggregate.type, "$Key").push(vKey);
	}

	/**
	 * Processes an EnumType element.
	 * @param {Element} oElement The element
	 * @param {object} oAggregate The aggregate
	 */
	function processEnumType(oElement, oAggregate) {
		var sQualifiedName = oAggregate.namespace + oElement.getAttribute("Name"),
			oEnumType = {
				"$kind" : "EnumType"
			};

		 V4MetadataConverter.processAttributes(oElement, oEnumType, {
			"IsFlags" : V4MetadataConverter.setIfTrue,
			"UnderlyingType" : function (sValue) {
				return sValue !== "Edm.Int32" ? sValue : undefined;
			}
		});

		oAggregate.result[sQualifiedName] = oAggregate.enumType = oEnumType;
		oAggregate.enumTypeMemberCounter = 0;
		V4MetadataConverter.annotatable(oAggregate, sQualifiedName);
	}

	/**
	 * Processes a Member element within an EnumType.
	 * @param {Element} oElement The element
	 * @param {object} oAggregate The aggregate
	 */
	function processEnumTypeMember(oElement, oAggregate) {
		var sName = oElement.getAttribute("Name"),
			sValue = oElement.getAttribute("Value"),
			vValue;

		if (sValue) {
			vValue = parseInt(sValue, 10);
			if (!_Helper.isSafeInteger(vValue)) {
				vValue = sValue;
			}
		} else {
			vValue = oAggregate.enumTypeMemberCounter;
			oAggregate.enumTypeMemberCounter++;
		}
		oAggregate.enumType[sName] = vValue;
		V4MetadataConverter.annotatable(oAggregate, sName);
	}

	/**
	 * Processes an ActionImport or FunctionImport element.
	 * @param {string} sWhat "Action" or "Function"
	 * @param {Element} oElement The element
	 * @param {object} oAggregate The aggregate
	 */
	function processImport(sWhat, oElement, oAggregate) {
		var oImport = {
				$kind : sWhat + "Import"
			},
			sName = oElement.getAttribute("Name");

		oImport["$" + sWhat]
			= V4MetadataConverter.resolveAlias(oElement.getAttribute(sWhat), oAggregate);
		 V4MetadataConverter.processAttributes(oElement, oImport, {
			"EntitySet" : function (sValue) {
				return resolveTargetPath(sValue, oAggregate);
			},
			"IncludeInServiceDocument" : V4MetadataConverter.setIfTrue
		});

		oAggregate.entityContainer[sName] = oImport;
		V4MetadataConverter.annotatable(oAggregate, sName);
	}

	/**
	 * Processes an Include element within a Reference.
	 * @param {Element} oElement The element
	 * @param {object} oAggregate The aggregate
	 */
	function processInclude(oElement, oAggregate) {
		var oInclude = V4MetadataConverter.getOrCreateArray(oAggregate.reference, "$Include");

		oInclude.push(oElement.getAttribute("Namespace") + ".");
	}

	/**
	 * Processes an IncludeAnnotations element within a Reference.
	 * @param {Element} oElement The element
	 * @param {object} oAggregate The aggregate
	 */
	function processIncludeAnnotations(oElement, oAggregate) {
		var oReference = oAggregate.reference,
			oIncludeAnnotation = {
				"$TermNamespace" : oElement.getAttribute("TermNamespace") + "."
			},
			aIncludeAnnotations =
				V4MetadataConverter.getOrCreateArray(oReference, "$IncludeAnnotations");

		 V4MetadataConverter.processAttributes(oElement, oIncludeAnnotation, {
			"TargetNamespace" : function setValue(sValue) {
				return sValue ? sValue + "." : sValue;
			},
			"Qualifier" : V4MetadataConverter.setValue
		});

		aIncludeAnnotations.push(oIncludeAnnotation);
	}

	/**
	 * Processes a NavigationPropertyBinding element within an EntitySet or Singleton.
	 * @param {Element} oElement The element
	 * @param {object} oAggregate The aggregate
	 */
	function processNavigationPropertyBinding(oElement, oAggregate) {
		var oNavigationPropertyBinding = V4MetadataConverter.getOrCreateObject(
				oAggregate.entitySet, "$NavigationPropertyBinding");

		oNavigationPropertyBinding[oElement.getAttribute("Path")]
			= resolveTargetPath(oElement.getAttribute("Target"), oAggregate);
	}

	/**
	 * Processes a Parameter element within an Action or Function.
	 * @param {Element} oElement The element
	 * @param {object} oAggregate The aggregate
	 */
	function processParameter(oElement, oAggregate) {
		var oActionOrFunction = oAggregate.actionOrFunction,
			oParameter = {};

		processTypedCollection(oElement.getAttribute("Type"), oParameter, oAggregate);
		 V4MetadataConverter.processAttributes(oElement, oParameter, {
			"Name" : V4MetadataConverter.setValue,
			"Nullable" : V4MetadataConverter.setIfFalse
		});
		V4MetadataConverter.processFacetAttributes(oElement, oParameter);

		V4MetadataConverter.getOrCreateArray(oActionOrFunction, "$Parameter").push(oParameter);
		V4MetadataConverter.annotatable(oAggregate, oParameter);
	}

	/**
	 * Processes a PropertyValue element within a Record.
	 * @param {Element} oElement The element
	 * @param {object} oAggregate The aggregate
	 */
	function processPropertyValue(oElement, oAggregate) {
		V4MetadataConverter.annotatable(oAggregate, oAggregate.annotatable.target,
			oElement.getAttribute("Property"));
	}

	/**
	 * Processes a Reference element.
	 * @param {Element} oElement The element
	 * @param {object} oAggregate The aggregate
	 */
	function processReference(oElement, oAggregate) {
		var oReference = V4MetadataConverter.getOrCreateObject(oAggregate.result, "$Reference");

		oAggregate.reference = oReference[oElement.getAttribute("Uri")] = {};
		V4MetadataConverter.annotatable(oAggregate, oAggregate.reference);
	}

	/**
	 * Processes a ReturnType element within an Action or Function.
	 * @param {Element} oElement The element
	 * @param {object} oAggregate The aggregate
	 */
	function processReturnType(oElement, oAggregate) {
		var oActionOrFunction = oAggregate.actionOrFunction,
			oReturnType = {};

		processTypedCollection(oElement.getAttribute("Type"), oReturnType, oAggregate);
		 V4MetadataConverter.processAttributes(oElement, oReturnType, {
			"Nullable" : V4MetadataConverter.setIfFalse
		});
		V4MetadataConverter.processFacetAttributes(oElement, oReturnType);

		oActionOrFunction.$ReturnType = oReturnType;
		V4MetadataConverter.annotatable(oAggregate, oReturnType);
	}

	/**
	 * Processes a Singleton element at the EntityContainer.
	 * @param {Element} oElement The element
	 * @param {object} oAggregate The aggregate
	 */
	function processSingleton(oElement, oAggregate) {
		var sName = oElement.getAttribute("Name");

		oAggregate.entityContainer[sName] = oAggregate.entitySet = {
			$kind : "Singleton",
			$Type : V4MetadataConverter.resolveAlias(oElement.getAttribute("Type"), oAggregate)
		};
		V4MetadataConverter.annotatable(oAggregate, sName);
	}

	/**
	 * Processes a Term element.
	 * @param {Element} oElement The element
	 * @param {object} oAggregate The aggregate
	 */
	function processTerm(oElement, oAggregate) {
		var sQualifiedName = oAggregate.namespace + oElement.getAttribute("Name"),
			oTerm = {
				$kind : "Term"
			};

		processTypedCollection(oElement.getAttribute("Type"), oTerm, oAggregate);
		 V4MetadataConverter.processAttributes(oElement, oTerm, {
			"Nullable" : V4MetadataConverter.setIfFalse,
			"BaseTerm" : function (sValue) {
				return sValue ? V4MetadataConverter.resolveAlias(sValue, oAggregate) : undefined;
			}
		});
		V4MetadataConverter.processFacetAttributes(oElement, oTerm);

		oAggregate.result[sQualifiedName] = oTerm;
		V4MetadataConverter.annotatable(oAggregate, sQualifiedName);
	}

	/**
	 * Processes a ComplexType or EntityType element.
	 * @param {Element} oElement The element
	 * @param {object} oAggregate The aggregate
	 * @param {object} oType The initial typed result object
	 */
	function processType(oElement, oAggregate, oType) {
		var sQualifiedName = oAggregate.namespace + oElement.getAttribute("Name");

		 V4MetadataConverter.processAttributes(oElement, oType, {
			"OpenType" : V4MetadataConverter.setIfTrue,
			"HasStream" : V4MetadataConverter.setIfTrue,
			"Abstract" : V4MetadataConverter.setIfTrue,
			"BaseType" : function (sType) {
				return sType ? V4MetadataConverter.resolveAlias(sType, oAggregate) : undefined;
			}
		});

		oAggregate.result[sQualifiedName] = oAggregate.type = oType;
		V4MetadataConverter.annotatable(oAggregate, sQualifiedName);
	}

	/**
	 * Processes the type in the form "Type" or "Collection(Type)" and sets the appropriate
	 * properties.
	 * @param {string} sType The type attribute from the Element
	 * @param {object} oProperty The property attribute in the JSON
	 * @param {object} oAggregate The aggregate
	 */
	function processTypedCollection(sType, oProperty, oAggregate) {
		var aMatches = V4MetadataConverter.rCollection.exec(sType);

		if (aMatches) {
			oProperty.$isCollection = true;
			sType = aMatches[1];
		}
		oProperty.$Type = V4MetadataConverter.resolveAlias(sType, oAggregate);
	}

	/**
	 * Processes a TypeDefinition element.
	 * @param {Element} oElement The element
	 * @param {object} oAggregate The aggregate
	 */
	function processTypeDefinition(oElement, oAggregate) {
		var sQualifiedName = oAggregate.namespace + oElement.getAttribute("Name"),
			oTypeDefinition = {
				"$kind" : "TypeDefinition",
				"$UnderlyingType" : oElement.getAttribute("UnderlyingType")
			};

		oAggregate.result[sQualifiedName] = oTypeDefinition;
		V4MetadataConverter.processFacetAttributes(oElement, oTypeDefinition);
		V4MetadataConverter.annotatable(oAggregate, sQualifiedName);
	}

	/**
	 * Processes a NavigationProperty element of a structured type.
	 * @param {Element} oElement The element
	 * @param {object} oAggregate The aggregate
	 */
	function processTypeNavigationProperty(oElement, oAggregate) {
		var sName = oElement.getAttribute("Name"),
			oProperty = {
				$kind : "NavigationProperty"
			};

		processTypedCollection(oElement.getAttribute("Type"), oProperty, oAggregate);
		 V4MetadataConverter.processAttributes(oElement, oProperty, {
			"Nullable" : V4MetadataConverter.setIfFalse,
			"Partner" : V4MetadataConverter.setValue,
			"ContainsTarget" : V4MetadataConverter.setIfTrue
		});

		oAggregate.type[sName] = oAggregate.navigationProperty = oProperty;
		V4MetadataConverter.annotatable(oAggregate, sName);
	}

	/**
	 * Processes a NavigationProperty OnDelete element.
	 * @param {Element} oElement The element
	 * @param {object} oAggregate The aggregate
	 */
	function processTypeNavigationPropertyOnDelete(oElement, oAggregate) {
		oAggregate.navigationProperty.$OnDelete = oElement.getAttribute("Action");
		V4MetadataConverter.annotatable(oAggregate, oAggregate.navigationProperty, "$OnDelete");
	}

	/**
	 * Processes a NavigationProperty OnDelete element.
	 * @param {Element} oElement The element
	 * @param {object} oAggregate The aggregate
	 */
	function processTypeNavigationPropertyReferentialConstraint(oElement, oAggregate) {
		var sProperty = oElement.getAttribute("Property"),
			oReferentialConstraint = V4MetadataConverter.getOrCreateObject(
				oAggregate.navigationProperty, "$ReferentialConstraint");

		oReferentialConstraint[sProperty] = oElement.getAttribute("ReferencedProperty");
		V4MetadataConverter.annotatable(oAggregate, oReferentialConstraint, sProperty);
	}

	/**
	 * Processes a Property element of a structured type.
	 * @param {Element} oElement The element
	 * @param {object} oAggregate The aggregate
	 */
	function processTypeProperty(oElement, oAggregate) {
		var sName = oElement.getAttribute("Name"),
			oProperty = {
				"$kind" : "Property"
			};

		processTypedCollection(oElement.getAttribute("Type"), oProperty, oAggregate);
		 V4MetadataConverter.processAttributes(oElement, oProperty, {
			"Nullable" : V4MetadataConverter.setIfFalse,
			"DefaultValue" : V4MetadataConverter.setValue
		});
		V4MetadataConverter.processFacetAttributes(oElement, oProperty);

		oAggregate.type[sName] = oProperty;
		V4MetadataConverter.annotatable(oAggregate, sName);
	}

	/**
	 * Resolves a target path including resolve aliases.
	 * @param {string} sPath The target path
	 * @param {object} oAggregate The aggregate containing the aliases
	 * @returns {string} The target path with the alias resolved (if there was one)
	 */
	function resolveTargetPath(sPath, oAggregate) {
		var iSlash;

		if (!sPath) {
			return sPath;
		}

		sPath =  V4MetadataConverter.resolveAliasInPath(sPath, oAggregate);
		iSlash = sPath.indexOf("/");

		if (iSlash >= 0 && sPath.indexOf("/", iSlash + 1) < 0) { // if there is exactly one slash
			if (sPath.slice(0, iSlash) === oAggregate.result.$EntityContainer) {
				return sPath.slice(iSlash + 1);
			}
		}
		return sPath;
	}

	V4MetadataConverter = jQuery.extend({}, _MetadataConverter, {
		/**
		 * Converts the metadata from XML format to a JSON object.
		 *
		 * @param {Document} oDocument
		 *   The XML DOM document
		 * @param {string} sUrl
		 *   The URL by which this document has been loaded (for error messages)
		 * @returns {object}
		 *   The metadata JSON
		 */
		convertXMLMetadata : function (oDocument, sUrl) {
			var oAggregate, oElement;

			jQuery.sap.measure.average("convertXMLMetadata", "",
				"sap.ui.model.odata.v4.lib._V4MetadataConverter");

			oElement = oDocument.documentElement;
			if (oElement.localName !== "Edmx" || oElement.namespaceURI !== sEdmxNamespace) {
				throw new Error(sUrl + " is not a valid OData V4 metadata document");
			}
			oAggregate = {
				"actionOrFunction" : null, // the current action or function
				"aliases" : {}, // maps alias -> namespace
				"annotatable" : null, // the current annotatable, see function annotatable
				"entityContainer" : null, // the current EntityContainer
				"entitySet" : null, // the current EntitySet/Singleton
				"enumType" : null, // the current EnumType
				"enumTypeMemberCounter" : 0, // the current EnumType member value counter
				"namespace" : null, // the namespace of the current Schema
				"navigationProperty" : null, // the current NavigationProperty
				"reference" : null, // the current Reference
				"schema" : null, // the current Schema
				"type" : null, // the current EntityType/ComplexType
				"result" : {}
			};

			// first round: find aliases
			V4MetadataConverter.traverse(oElement, oAggregate, oAliasConfig);
			// second round, full conversion
			V4MetadataConverter.traverse(oElement, oAggregate, oFullConfig);

			if (oAggregate.result.$Version !== "4.0") {
				throw new Error(sUrl + ": Unsupported OData version " + oAggregate.result.$Version);
			}

			jQuery.sap.measure.end("convertXMLMetadata");
			return oAggregate.result;
		},

		/**
		 * Processes the TFacetAttributes and TPropertyFacetAttributes of the elements Property,
		 * TypeDefinition etc.
		 * @param {Element} oElement The element
		 * @param {object} oResult The result object to fill
		 */
		processFacetAttributes : function (oElement, oResult) {
			 V4MetadataConverter.processAttributes(oElement, oResult, {
				"MaxLength" : V4MetadataConverter.setNumber,
				"Precision" : V4MetadataConverter.setNumber,
				"Scale" : function (sValue) {
					return sValue === "variable" ? sValue : V4MetadataConverter.setNumber(sValue);
				},
				"SRID" : V4MetadataConverter.setValue,
				"Unicode" : V4MetadataConverter.setIfFalse
			});
		}
	});

	return V4MetadataConverter;
}, /* bExport= */false);
