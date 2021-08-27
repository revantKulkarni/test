import { actionTypes } from "@servicenow/ui-core";
const { COMPONENT_BOOTSTRAPPED } = actionTypes;
import {
	FETCH_LEFT_COUNT,
	FETCH_LEFT_COUNT_SUCCEEDED,
	FETCH_LEFT_COUNT_FAILED,
	FETCH_RIGHT_COUNT,
	FETCH_RIGHT_COUNT_SUCCEEDED,
	FETCH_RIGHT_COUNT_FAILED,
	AP4_METRIC_INDICATOR_NUMBER_CLICK,
	CARD_CLICKED,
	AP4_FILTER,
} from "./constants";
import { loadLeftAggregateCount, loadRightAggregateCount } from "./requests";

const defaultCondition = (coeffects, table, conditionOne, conditionTwo) => {
	const { dispatch, updateState } = coeffects;
	dispatch(FETCH_LEFT_COUNT, {
		tableName: table,
		sysparm_query: conditionOne,
		sysparm_count: true,
	});

	if (conditionTwo) {
		dispatch(FETCH_RIGHT_COUNT, {
			tableName: table,
			sysparm_query: conditionTwo,
			sysparm_count: true,
		});
		updateState({ updatedConditionTwo: conditionTwo });
	}
	updateState({ updatedConditionOne: conditionOne });
};

const loadTableAggregateData = (coeffects) => {
	const { action, state } = coeffects;
	action.stopPropagation();
	const { table, conditionOne, conditionTwo } = state.properties;
	defaultCondition(coeffects, table, conditionOne, conditionTwo);
};

const onCardClicked = ({ dispatch, action, state }) => {
	action.stopPropagation();
	const { table } = state.properties;
	const { updatedConditionOne, updatedConditionTwo } = state;
	const { name } = action.payload;
	const condition =
		name === "leftNumber" ? updatedConditionOne : updatedConditionTwo;
	dispatch(AP4_METRIC_INDICATOR_NUMBER_CLICK, {
		table: table,
		condition: condition,
	});
};

const getEncodedQuery = (filter, table) => {
	let encodedQuery = "";
	let countAppliedValues = 0;
	const arrayOfTableNames = [table];

	filter.forEach((obj) => {
		const fieldName = obj.apply_to[0].split(".")[1];
		const valueArrLen = obj.values.length;
		valueArrLen > 0 ? countAppliedValues++ : null;

		if (valueArrLen > 0) {
			obj.apply_to.map((val) => {
				return arrayOfTableNames.push(val.split(".")[0]);
			});
		}
		const values = obj.values.map((val, idx) => {
			if (idx === valueArrLen - 1) return fieldName + "=" + val;
			else return fieldName + "=" + val + "^OR";
		});
		if (values.length > 0) {
			encodedQuery = encodedQuery + values.join("") + "^";
		}
	});

	return {
		countAppliedValues: countAppliedValues,
		arrayOfTableNames: arrayOfTableNames,
		encodedQuery: encodedQuery,
	};
};

const queryConditions = (filterParameters) => {
	const {
		coeffects,
		table,
		conditionTwo,
		filteredConditionOne,
		filteredConditionTwo,
	} = filterParameters;
	const { dispatch, updateState } = coeffects;

	dispatch(FETCH_LEFT_COUNT, {
		tableName: table,
		sysparm_query: filteredConditionOne,
		sysparm_count: true,
	});
	if (conditionTwo) {
		dispatch(FETCH_RIGHT_COUNT, {
			tableName: table,
			sysparm_query: filteredConditionTwo,
			sysparm_count: true,
		});
		updateState({ updatedConditionTwo: filteredConditionTwo });
	}
	updateState({ updatedConditionOne: filteredConditionOne });
};

const appliedConditions = (filterParameters) => {
	const {
		filter,
		coeffects,
		countAppliedValues,
		table,
		conditionOne,
		conditionTwo,
		isTableValid,
	} = filterParameters;

	filter.map(() => {
		if (filter.length === 0 || countAppliedValues === 0) {
			defaultCondition(coeffects, table, conditionOne, conditionTwo);
		} else if (isTableValid) {
			queryConditions(filterParameters);
		}
	});
};

const applyFilter = (coeffects) => {
	const { action, state } = coeffects;
	action.stopPropagation();
	const { table, conditionOne, conditionTwo } = state.properties;
	const filter = action.payload;

	const returnEncodedValues = getEncodedQuery(filter, table);
	const { countAppliedValues, arrayOfTableNames, encodedQuery } =
		returnEncodedValues;

	const isTableValid = arrayOfTableNames.every((val, i, arr) => val === arr[0]);
	const filteredConditionToApply = encodedQuery.slice(0, -1);
	const filteredConditionOne = conditionOne + "^" + filteredConditionToApply;
	const filteredConditionTwo = conditionTwo + "^" + filteredConditionToApply;

	const filterParameters = {
		filter: filter,
		coeffects: coeffects,
		countAppliedValues: countAppliedValues,
		table: table,
		conditionOne: conditionOne,
		conditionTwo: conditionTwo,
		isTableValid: isTableValid,
		filteredConditionOne: filteredConditionOne,
		filteredConditionTwo: filteredConditionTwo,
	};

	appliedConditions(filterParameters);
};

export default {
	actionHandlers: {
		[COMPONENT_BOOTSTRAPPED]: loadTableAggregateData,

		[FETCH_LEFT_COUNT]: loadLeftAggregateCount.httpEffect,
		[FETCH_LEFT_COUNT_SUCCEEDED]: loadLeftAggregateCount.success,
		[FETCH_LEFT_COUNT_FAILED]: loadLeftAggregateCount.failed,

		[FETCH_RIGHT_COUNT]: loadRightAggregateCount.httpEffect,
		[FETCH_RIGHT_COUNT_SUCCEEDED]: loadRightAggregateCount.success,
		[FETCH_RIGHT_COUNT_FAILED]: loadRightAggregateCount.failed,

		[CARD_CLICKED]: onCardClicked,

		[AP4_FILTER]: applyFilter,
	},
	actions: {
		[AP4_METRIC_INDICATOR_NUMBER_CLICK]: {
			schema: {
				type: "object",
				properties: {
					table: { type: "string" },
					condition: { type: "string" },
				},
			},
		},
	},
};
