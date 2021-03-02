var WBS_BULK_TASK = {};
(function (plugin) {
	var jQ;
	var parentId = '';
	var milestoneId = '';
	var parentTaskId = '';
	var link_target_did = '';

	//Added by mizan on 02-04-2020
	var formatter = gantt.ext.formatters.durationFormatter({
		enter: "day",
		store: "day",
		format: "auto"
	});
	var linksFormatter = gantt.ext.formatters.linkFormatter({ durationFormatter: formatter });
	var editors = {
		text: { type: "text", map_to: "text" },
		start_date: { type: "date", map_to: "start_date_display" },
		due_date: { type: "date", map_to: "due_date_display" },
		duration: { type: "duration", map_to: "duration_hours"},
		description: { type: "text", map_to: "task_description" },
		resource: { type: "select", map_to: "user_id", options: gantt.serverList("people") },
		priority: { type: "select", map_to: "task_priority", options: getTaskPriorities() },
		//status: { type: "select", map_to: "task_status", options: getTaskStatusList() },
		dependent_task: { type: "predecessor_editor", map_to: "did" },
		attachment: { type: "text", map_to: "attachment" }
	};

	//added by mizan on 22 Feb, 2021
	//https://snippet.dhtmlx.com/5/a395ada84
	var zoomConfig = {
		levels: [
			{
				name: "hours",
				scales: [
					{ unit: "day", step: 1, format: "%d %M" },
					{ unit: "hour", step: 1, format: "%h" }
				],
				round_dnd_dates: true,
				min_column_width: 30,
				scale_height: 60
			},
			{
				name: "days",
				scales: [
					{ unit: "week", step: 1, format: "Week #%W" },
					{ unit: "day", step: 1, format: "%j %D" }
				],
				round_dnd_dates: true,
				min_column_width: 80,
				scale_height: 60
			},
			{
				name: "weeks",
				scales: [
					{ unit: "month", step: 1, format: "%F, %Y" },
					{ unit: "week", step: 1, format: "#%W" },
				],
				round_dnd_dates: false,
				min_column_width: 50,
				scale_height: 60
			},
			{
				name: "months",
				scales: [
					{ unit: "year", step: 1, format: "%Y" },
					{ unit: "month", step: 1, format: "%F" }
				],
				round_dnd_dates: false,
				min_column_width: 50,
				scale_height: 60
			},
			{
				name: "quarters",
				scales: [
					{ unit: "year", step: 1, format: "%Y" },
					{
						unit: "quarter", step: 1, format: function quarterLabel(date) {
							var month = date.getMonth();
							var q_num;

							if (month >= 9) {
								q_num = 4;
							} else if (month >= 6) {
								q_num = 3;
							} else if (month >= 3) {
								q_num = 2;
							} else {
								q_num = 1;
							}

							return "Quarter#" + q_num;
						}
					},
					{ unit: "month", step: 1, format: "%M" }
				],
				round_dnd_dates: false,
				min_column_width: 90,
				scale_height: 60
			},
			{
				name: "years",
				scales: [
					{ unit: "year", step: 1, format: "%Y" },
				],
				round_dnd_dates: false,
				min_column_width: 50,
				scale_height: 60
			}
		],
		useKey: "ctrlKey",
		trigger: "wheel",
		element: function () {
			return gantt.$root.querySelector(".gantt_task");
		}
	};

	var selectedProject;
	function getScales(filterBy) {
		switch (filterBy) {
			case 'year':
				return [{ unit: "year", step: 1, format: "%Y" }];
			case 'month':
				return [
					{ unit: "month", step: 1, format: "%F, %Y" },
					{ unit: "week", step: 1, format: "%W" }
				];
			case 'week':
				return [
					{ unit: "week", step: 1, format: "%W" },
					{ unit: "day", step: 1, format: "%j %D" }
				];
			case 'day':
				return [
					{ unit: "day", step: 1, format: "%d %M" },
					{ unit: "hour", step: 1, format: "%h" },
				];
			default:
				return [
					{ unit: "day", step: 1, format: "%d %M" },
					{ unit: "hour", step: 1, format: "%h" },
				];
		}
	}

	function init(data, project) {
		//console.log(data);
		selectedProject = project;
		jQ = $('#wbsBulkTaskSchedule');
		jQ.find('.day').addClass('active btn-success');

		//Gantt Configuration
		//gantt.config.xml_date = "%Y-%m-%d %H:%i:%s"; // added on 20
		//gantt.config.order_branch = "marker"; // added on 20
		//gantt.config.order_branch_free = true;// added on 20
		//gantt.config.grid_resize = true; // added on 20

		//gantt.config.scales = getScales();
		gantt.config.keyboard_navigation_cells = true;
		gantt.config.auto_scheduling = true;
		gantt.config.auto_scheduling_strict = true;
		gantt.config.row_height = 40;
		gantt.config.fit_tasks = true;
		gantt.config.show_unscheduled = true;
		gantt.config.placeholder_task = true;
		gantt.config.auto_types = true;
		//gantt.config.readonly = true;
		gantt.config.duration_unit = "hour";
		gantt.config.duration_step = 0.1;
		gantt.config.work_time = true;
		gantt.config.skip_off_time = true;
		gantt.config.scale_height = 50;
		gantt.config.drag_links = true;
		gantt.config.drag_progress = true;

		gantt.config.open_tree_initially = true;
		//gantt.config.order_branch = true;
		setWorkTime(gantt);
		//formatter = gantt.ext.formatters.durationFormatter({
		//	//enter: "day",
		//	//store: "minute", // duration_unit
		//	//format: "day",
		//	hoursPerDay: 9,
		//	hoursPerWeek: 40,
		//	daysPerMonth: 30
		//});

		var dependentTasks = [];		
		data.projecttasks.forEach(function (x) {
			dependentTasks.push({ "key": x.id, "label": x.text });
		});
		gantt.serverList("projecttask", dependentTasks);
		//console.log('dependentTasks: ' + JSON.stringify(dependentTasks));
		var materialTypeList = [];
		data.materialtypes.forEach(function (x) {
			materialTypeList.push({ "key": x.id, "label": x.text });
		});
		gantt.serverList("materialtype", materialTypeList);
		//console.log('materialTypeList: ' + JSON.stringify(materialTypeList));
		var machinesTypeList = [];
		data.machinestypes.forEach(function (x) {
			machinesTypeList.push({ "key": x.id, "label": x.text });
		});
		gantt.serverList("machinestype", machinesTypeList);
		//console.log('machinesTypeList: ' + JSON.stringify(machinesTypeList));
		var miscellaneousTypeList = [];
		data.miscellaneousypes.forEach(function (x) {
			miscellaneousTypeList.push({ "key": x.id, "label": x.text });
		});
		gantt.serverList("miscellaneoustype", miscellaneousTypeList);
		//console.log('miscellaneousTypeList: ' + JSON.stringify(miscellaneousTypeList));

		gantt.config.columns = getGanttColumns(project);
		gantt.config.layout = fullLayout;

		gantt.templates.task_class = taskClass;
		gantt.templates.link_class = linkClass; // for testing
		gantt.templates.grid_row_class = gridRowClassFunc;
		gantt.templates.task_row_class = taskRowClassFunc;
		gantt.templates.timeline_cell_class = timelineCellClassFunc;
		gantt.templates.tooltip_text = tooltip;

		gantt.attachEvent("onGanttReady", onGanttReadyFunc);
		//gantt.attachEvent("onGanttRender", function () {
		//	console.log("calling onGanttRender...");
		//});

		//disables task details on double click
		gantt.attachEvent("onBeforeLightbox", function (id) {
			return false;
		});
		//gantt.attachEvent("onBeforeLightbox", onBeforeLightbox);

		//gantt.attachEvent("onAfterLightbox", onAfterLightbox);
		gantt.attachEvent("onLightboxSave", onLightboxSaveFunc);
		gantt.attachEvent("onLightboxDelete", onLightboxDeleteFunc);

		//"resize", "progress", "move", "ignore"
		gantt.attachEvent("onBeforeTaskDrag", beforeDrag);
		gantt.attachEvent("onAfterTaskDrag", afterTaskDrag);
		gantt.attachEvent("onTaskDrag", onTaskDrag);
		//gantt.attachEvent("onLinkDblClick", function (id, e) {
		//	console.log('onLinkDblClick', id, e);
		//});

		//Add Links
		//gantt.attachEvent("onLinkValidation", onLinkValidation);
		gantt.attachEvent("onBeforeLinkAdd", onBeforeLinkAdd);
		gantt.attachEvent("onAfterLinkAdd", onAfterLinkAdd);
		gantt.attachEvent("onAfterLinkDelete", onAfterLinkDelete);
		gantt.attachEvent("onTaskCreated", function (task) {
			//console.log(task.type + ' === ' + gantt.config.types.placeholder);
			if (task.type === gantt.config.types.placeholder) {
				task.text = "Create a new milestone";
				task.duration = 1;
				task.task_priority = 0;
				task.task_status = 0;
				task.task_description = "add new milestone description";		
				//gantt.createTask({
				//	id: +new Date(),
				//	start_date: selectedProject.start_date,
				//	duration: 1,
				//	task_priority: 0,
				//	task_status: 0,
				//	text: "Create a new milestone",
				//	task_description: "add new milestone description",
				//	project_id: selectedProject.did
				//});
			}
			gantt.batchUpdate(function () {
				gantt.eachTask(function (task) {
					if (gantt.hasChild(task.id)) {
						var no_placeholder = true;
						gantt.eachTask(function (child) {
							if (child.type === "placeholder") {
								no_placeholder = false;
							}
						}, task.id);

						if (no_placeholder) {
							gantt.addTask({ id: gantt.uid(), text: 'add new task', task_description: 'add new task description', parent: task.id, type: "placeholder" });
							//gantt.createTask({
							//	id: gantt.uid(),
							//	text: 'add new task',
							//	task_description: 'add new task description',
							//	parent: task.id,
							//	type: "placeholder"
							//});
							//console.log('addTask: ' + JSON.stringify(gantt.getTask(gantt.uid())));
						}
					}
					else if (task.is_milestone) {
						gantt.addTask({ id: gantt.uid(), text: 'add new task', task_description: 'add new task description', parent: task.id, type: "placeholder" });
						//gantt.createTask({
						//	id: gantt.uid(),
						//	text: 'add new task',
						//	task_description: 'add new task description',
						//	parent: task.id,
						//	type: "placeholder"
						//});
						//console.log('onTaskCreated: ' + JSON.stringify(task));
					}
				});
			});

			return true;
		});

		//Editor
		gantt.locale.labels.section_name = "Name";
		gantt.locale.labels.section_period = "Time Period";
		gantt.locale.labels.section_owner = "Resource";
		gantt.locale.labels.section_status = "Status";
		gantt.locale.labels.section_priority = "Priority";
		gantt.locale.labels.section_taskHours = "Estimated Hours";
		gantt.form_blocks["task_hours"] = {
			render: function (sns) {
				return `<div class='gantt_cal_ltext' style='height:38px;'>
							<input class='width-40p' type='number'>  &nbsp; h &nbsp;&nbsp;
							<input class='width-40p' type='number' min='0' max='59'>  &nbsp; m
						</div>`;
			},
			set_value: function (node, value, task, section) {
				node.childNodes[1].value = task.duration_hours || '';
				node.childNodes[3].value = task.duration_mins || '';
			},
			get_value: function (node, task, section) {
				task.duration_hours = node.childNodes[1].value;
				task.duration_mins = node.childNodes[3].value;
				return task;
			},
			focus: function (node) {
			}
		};
		gantt.locale.labels.section_startTime = 'Start Time';
		gantt.form_blocks["start_time"] = {
			render: function (sns) {
				return `<div class='gantt_cal_ltext' style='height:38px;'>
							<div class='input-group startDate'>
								<input type='text' class='form-control' />
								<span class='input-group-addon'><span class='glyphicon glyphicon-calendar'></span></span>
							</div>
						</div>`;
			},
			set_value: function (node, value, task, section) {
				var perentTask = task.parent ? gantt.getTask(task.parent) : selectedProject;
				var startDate = value ? moment(value).format('MM/DD/YYYY hh:mm A') : null;
				var startContainer = $('.startDate');
				startContainer.datetimepicker({
					autoClose: true,
					todayHighlight: true,
					defaultDate: startDate,
					pickTime: true,
					minDate: moment(perentTask.start_date).subtract(1, 'days'),
					maxDate: moment(perentTask.end_date)
				});

				startContainer.find('input').val(startDate);
				startContainer.data('DateTimePicker').setDate(startDate);
				node.childNodes[0].value = startDate || '';
			},
			get_value: function (node, task, section) {
				return node.childNodes[1].childNodes[1].value;
			},
			focus: function (node) {
			}
		};
		gantt.locale.labels.section_dueDate = 'Due Date';
		gantt.form_blocks["due_date"] = {
			render: function (sns) {
				return `<div class='gantt_cal_ltext' style='height:38px;'>
							<div class='input-group dueDate'>
								<input type='text' class='form-control' />
								<span class='input-group-addon'><span class='glyphicon glyphicon-calendar'></span></span>
							</div>
						</div>`;
			},
			set_value: function (node, value, task, section) {
				var perentTask = task.parent ? gantt.getTask(task.parent) : selectedProject;
				var dueDate = null;
				if (value) {
					dueDate = generateDateFromString(value);
					dueDate = moment(dueDate).format('MM/DD/YYYY');
				}
				var dueDateContainer = $('.dueDate');
				dueDateContainer.datetimepicker({
					autoClose: true,
					todayHighlight: true,
					format: 'L',
					defaultDate: dueDate,
					pickTime: false,
					minDate: moment(perentTask.start_date).subtract(1, 'days'),
					maxDate: moment(perentTask.end_date)
				});

				if (dueDate) {
					dueDateContainer.find('input').val(dueDate);
					dueDateContainer.data('DateTimePicker').setDate(dueDate);
					node.childNodes[0].value = dueDate || '';
				}
			},
			get_value: function (node, task, section) {
				return node.childNodes[1].childNodes[1].value;
			},
			focus: function (node) {
			}
		};
		gantt.locale.labels.section_dependentTask = "Predecessors";
		gantt.config.lightbox.sections = [
			{ name: "name", height: 38, map_to: "text", type: "textarea", focus: true },
			{ name: "startTime", height: 38, type: "start_time", map_to: "start_date" }, //, time_format: ["%m", "%d", "%Y", "%H:%i"]},
			{ name: "taskHours", type: "task_hours", map_to: "auto" },
			{ name: "dueDate", height: 38, type: "due_date", map_to: "due_date" }, 
			{ name: "owner", height: 38, map_to: "user_id", type: "select", options: gantt.serverList("people") },
			{ name: "status", height: 38, map_to: "task_status", type: "select", options: getTaskStatusList() },
			{ name: "priority", height: 38, map_to: "task_priority", type: "select", options: getTaskPriorities() },
			{ name: "description", height: 60, map_to: "task_description", type: "textarea" },
			{ name: "dependentTask", height: 100, map_to: "did", type: "multiselect", options: gantt.serverList("projecttask")}
		];
		gantt.locale.labels.section_estimatedHours = "Estimated Hours";
		gantt.form_blocks["estimated_hours"] = {
			render: function (sns) {
				return "<div class='gantt_cal_ltext' style='height:38px;'><input type='number'></div>";
			},
			set_value: function (node, value, task, section) {
				node.childNodes[0].value = value || "";
			},
			get_value: function (node, task, section) {
				return node.childNodes[0].value;
			},
			focus: function (node) {
			}
		};
		gantt.config.types.cmilestone = "cmilestone";
		gantt.locale.labels.type_milestone = "Milestone";
		gantt.config.lightbox.cmilestone_sections = [
			{ name: "name", height: 38, map_to: "text", type: "textarea", focus: true },
			{ name: "period", height: 38, type: "time", map_to: "auto", time_format: ["%m", "%d", "%Y"]},
			{ name: "estimatedHours", type: "estimated_hours", map_to: "duration_hours" },
			{ name: "description", height: 60, map_to: "task_description", type: "textarea" }
		];
		//Custom Editor
		gantt.config.editor_types.predecessor_editor = {
			show: function (id, column, config, placeholder) {
				var height = "100" + "px";
				//var html = "<div style='height:" + height + ";'><select multiple>";
				var html = "<div><select>";
				//var height = "23" + "px";
				//var html = "<div class='gantt_cal_ltext gantt_cal_chosen gantt_cal_multiselect' style='height:" +
				//	height + ";'><select data-placeholder='...' class='chosen-select' multiple>";
				var list = gantt.serverList("projecttask");
				if (list) {
					for (var i = 0; i < list.length; i++) {
						if (list !== undefined && list[i].key === list) {
							continue;
						}
						html += "<option value='" + list[i].key + "'>" + list[i].label + "</option>";
					}
				}
				html += "</select></div>";
				placeholder.innerHTML = html;
			},
			hide: function () {
				//gantt.render();
			},
			set_value: function (value, id, column, node) {
				console.log('predecessor_editor -> set_value with value: ' + value + ', id: ' + id + ', column:' + JSON.stringify(column) + ', node: ' + JSON.stringify(node));
				var options = node.firstChild.firstChild;
				//if (value) value = JSON.stringify(value); //value.split(',');
				//else value = [];
				//for (var j = 0; j < value.length; j++) {
				//	for (var i = 0; i < options.length; i++) {
				//		if (options[i].value === value[j]) options[i].selected = true;
				//	}
				//}
				//for (var i = 0; i < options.length; i++) {
				//	if (options[i].value === value) {
				//		options[i].selected = true;
				//	}
				//}
			},
			get_value: function (id, column, node) {
				console.log('predecessor_editor -> get_value with id: ' + id + ', column' + JSON.stringify(column) + ', node: ' + JSON.stringify(node));
				var task = gantt.getTask(id);
				console.log('predecessor_editor -> get_value task: ' + JSON.stringify(task));
				var selected_options = node.firstChild.firstChild.selectedOptions;
				var values = [];
				for (var i = 0; i < selected_options.length; i++) {
					values.push(selected_options[i].value);
				}
				task.did = values.join();
				return task.did;
			},
			is_changed: function (value, id, column, node) {
				console.log('predecessor_editor -> is_changed with value: ' + value + ', id: ' + id + ', column:' + JSON.stringify(column) + ', node: ' + JSON.stringify(node));
				return true;
			},
			is_valid: function (value, id, column, node) {
				console.log('predecessor_editor -> is_valid with value: ' + value + ', id: ' + id + ', column:' + JSON.stringify(column) + ', node: ' + JSON.stringify(node));
				return true;
			},
			save: function (id, column, node) {
				console.log('predecessor_editor -> save with id: ' + id + ', column:' + JSON.stringify(column) + ', node: ' + JSON.stringify(node));
			},
			focus: function (node) {
				console.log('predecessor_editor -> focus with node: ' + JSON.stringify(node));
			}
		};
		//Resource Manages
		gantt.config.resource_store = "resource";
		gantt.config.resource_property = "user_id";
		gantt.$resourcesStore = gantt.createDatastore({
			name: gantt.config.resource_store,
			type: "treeDatastore",
			initItem: function (item) {
				item.parent = item.parent || gantt.config.root_id;
				item[gantt.config.resource_property] = item.parent;
				item.open = true;
				return item;
			}
		});
		gantt.templates.resource_cell_class = resourceCellClassFunc;
		gantt.templates.resource_cell_value = resourceCellValueFunc;
		gantt.$resourcesStore.attachEvent("onAfterSelect", function (id) {
			console.log('onAfterSelect with id: ' + id);
			gantt.refreshData();
		});
		//gantt.$resourcesStore.attachEvent("onParse", onResourceParse);
		//gantt.$resourcesStore.parse(data.users);

		//gantt.attachEvent("onTaskClick", function (id, e) {
		//	var task = this.getTask(id);
		//	parentId = task.parent;
		//	link_target_did = task.did;
		//	//console.log('calling onTaskClick with taskid: ' + id + ', parentId: ' + parentId + ', task details: ' + JSON.stringify(this.getTask(id)));
		//	//var parent = gantt.getParent(id);
		//	//var task = this.getTask(id);
		//	console.log('onTaskClick with taskid: ' + id + ', parentId: ' + parentId + ', link_target_did : ' + link_target_did);
		//	return true;
		//});

		gantt.attachEvent("onTaskClick", function (id, e) {
			var task = this.getTask(id);
			parentId = task.parent;
			link_target_did = task.did;
			console.log('onTaskClick with taskid: ' + id + ', parentId: ' + parentId + ', link_target_did : ' + link_target_did);
			//console.log('Task Type: ' + task.type);
			var button = e.target.closest("[data-action]")
			console.log('calling onTaskClick with taskid: ' + id + ', button: ' + button);
			if (button) {
				var action = button.getAttribute("data-action");
				switch (action) {
					case "edit":
						gantt.showLightbox(id);
						break;
					case "add":
						WBS_BULK_TASK.customAdd('grid', id);
						break;
					case "delete":
						gantt.confirm({
							title: gantt.locale.labels.confirm_deleting_title,
							text: gantt.locale.labels.confirm_deleting,
							callback: function (res) {
								if (res) {								
									switch (task.type) {
										case "task":
											deteletTask(id);
											break;
										case "cmilestone":
											deteletMilestone(id);
											break;
									}
								}
							}
						});
						break;
				}
				return false;
			}
			return true;
		});

		var new_task_from_placeholder = false;
		gantt.attachEvent("onAfterTaskAdd", function (id, task) {
			//console.log('calling onAfterTaskAdd: ' + JSON.stringify(task));
			if (new_task_from_placeholder) {
				//console.log('calling onAfterTaskAdd with id :' + id);
				//var deleteTaskId = id.replace(/[^a-zA-Z]+/g, '');
				//if (deleteTaskId === '')
				//	gantt.deleteTask(id);
				gantt.deleteTask(id);
				new_task_from_placeholder = false;
			}
		});

		//inline edit
		gantt.ext.inlineEditors.attachEvent("onBeforeSave", function (state) {
			//console.log('calling onBeforeSave: ' + JSON.stringify(state));
			new_task_from_placeholder = true;
			return true;
		});
		gantt.ext.inlineEditors.attachEvent("onSave", function (state) {
			console.log('calling onSave: ' + JSON.stringify(state));
			console.log('onSave with parentId: ' + parentId);

			var columnName = state.columnName;
			//var project_start_date = moment(selectedProject.start_date, 'DD-MM-YYYY HH:mm:ss').format();
			//console.log(selectedProject.start_date + ', after moment format: ' + project_start_date);
			if (state.oldValue === 'add new task' || state.oldValue === 'New Task') {				
				var newTask = {
					id: state.id,
					duration: 1,
					duration_hours: 1,
					task_description: state.newValue,
					text: state.newValue,
					type: 'task',
					parent: parentId,
					project_id: selectedProject.did
				};
				console.log('onSave -> newTask: ' + JSON.stringify(newTask));
				createOrUpdateTask(newTask, state.id, true, state.columnName);
			}
			else if (state.oldValue === 'New Sub-Task') {
				var newSubTask = {
					id: state.id,
					duration: 1,
					duration_hours: 1,
					text: state.newValue,
					task_description: state.newValue,
					type: 'task',
					parent: parentId,
					project_id: selectedProject.did,
					milestone_id: milestoneId,
					parent_task_id: parentTaskId
				};
				console.log('onSave -> newSubTask: ' + JSON.stringify(newSubTask));
				createOrUpdateTask(newSubTask, state.id, true, state.columnName);
			}
			else if (state.oldValue === 'Create a new milestone' || state.oldValue === 'New Milestone') {
				var newMilestone = {
					id: state.id,
					duration: 1,
					duration_hours: 1,
					task_description: state.newValue,
					text: state.newValue,
					type: gantt.config.types.cmilestone,
					project_id: selectedProject.did
				};
				//console.log('onSave -> newMilestone: ' + JSON.stringify(newMilestone));
				createOrUpdateMilestone(newMilestone, state.id, true, state.columnName);
			}
			else if (columnName === "did")
			{
				console.log('columnName: ' + columnName);	
				var task = gantt.getTask(state.id);
				task.did = state.newValue;
				gantt.updateTask(task.id);

				var data = {
					Id: link_target_did,
					DependentTaskId: state.newValue
				};
				addNewLinkDetails(+new Date(), data);				
			}
			else {
				item = gantt.getTask(state.id);
				console.log('onSave -> else block: ' + JSON.stringify(item));
				if (item.is_milestone) {
					createOrUpdateMilestone(item, state.id, false, state.columnName);
				}
				else
					createOrUpdateTask(item, state.id, false, state.columnName);				
			}

			if (gantt.autoSchedule && (columnName === "start_date_display" || columnName === "due_date_display" || columnName === "duration_hours")) {
				gantt.autoSchedule();
			}
		});
		
		//gantt.attachEvent("onAfterUpdate", function (id) {
		//	console.log('calling onAfterUpdate');
		//	gantt.load();			
		//});

		//Keyboard Navigation
		//gantt.plugins({
		//	keyboard_navigation: true
		//});
		//gantt.ext.inlineEditors.attachEvent("onBeforeEditStart", function (state) {
		//	gantt.config.keyboard_navigation = false;
		//	return true;
		//});

		//gantt.ext.inlineEditors.attachEvent("onEditEnd", function (state) {
		//	gantt.config.keyboard_navigation = true;
		//});
		//

		//Highlight Critical Path V 7.0.9
		//gantt.plugins({
		//	critical_path: true
		//});
		gantt.config.highlight_critical_path = true;

		//Full Screen V 7.0.9
		//gantt.plugins({
		//	fullscreen: true
		//});
		gantt.attachEvent("onTemplatesReady", function () {
			var toggle = document.createElement("i");
			toggle.className = "fa fa-expand gantt-fullscreen";
			gantt.toggleIcon = toggle;
			gantt.$container.appendChild(toggle);
			toggle.onclick = function () {
				gantt.ext.fullscreen.toggle();
			};
		});

		//added on 20
		gantt.ext.fullscreen.getFullscreenElement = function () {
			console.log('calling getFullscreenElement');
			return document.querySelector(".demo-main-container");
		};
		////added on 20
		//gantt.attachEvent("onCollapse", function () {
		//	var el = document.querySelector(".dhx-navigation");
		//	el.removeAttribute("style");

		//	var chatapp = document.getElementById("chat-application");
		//	chatapp.style.visibility = "visible";
		//});
		////added on 20
		//gantt.attachEvent("onExpand", function () {
		//	var el = document.querySelector(".dhx-navigation");
		//	el.style.position = "static";

		//	var chatapp = document.getElementById("chat-application");
		//	chatapp.style.visibility = "hidden";
		//});

		//gantt.attachEvent("onExpand", function () {
		//	var icon = gantt.toggleIcon;
		//	if (icon) {
		//		icon.className = icon.className.replace("fa-expand", "fa-compress");
		//	}

		//});
		//gantt.attachEvent("onCollapse", function () {
		//	var icon = gantt.toggleIcon;
		//	if (icon) {
		//		icon.className = icon.className.replace("fa-compress", "fa-expand");
		//	}
		//});

		//Init Chart
		gantt.ext.zoom.init(zoomConfig);
		gantt.ext.zoom.setLevel("hours");
		//gantt.$zoomToFit = false;
		gantt.init("chart_div");
		gantt.unselectTask();
		gantt.clearAll();
		gantt.parse(data);
		gantt.eachTask(function (task) { task.$open = true; });
		gantt.$resourcesStore.attachEvent("onParse", onResourceParse);
		gantt.$resourcesStore.parse(data.users);
		gantt.render();
		//ganttModules.menu.setup(); //added on 20

		//inline Editors
		gantt.ext.inlineEditors.attachEvent("onBeforeEditStart", function (state) {
			//console.log('calling onBeforeEditStart: ' + JSON.stringify(state));
			return true;
		});		
		gantt.ext.inlineEditors.attachEvent("onEditStart", function (state) {
			//console.log('calling onEditStart: ' + JSON.stringify(state));
		});
		gantt.ext.inlineEditors.attachEvent("onEditEnd", function (state) {
			//console.log('calling onEditEnd: ' + JSON.stringify(state));
			new_task_from_placeholder = false;
		});

		//Custom UI Events
		//jQ.find('#ProjectId').on("change", function (e) {
		//	var url = '/PMO/Task/CreateWbs';
		//	var projectId = parseInt($('#ProjectId').val());
		//	if (projectId > 0) url = url + '?projectId=' + projectId;
		//	location.href = url;
		//});

		jQ.find('.filter-by').click(function () {
			var filterBy = $(this).data('id');
			jQ.find('.filter-by').each(function () {
				$(this).removeClass('active btn-success');
			});
			$(this).addClass('active btn-success');
			switch (filterBy) {
				case 'year': {
					gantt.config.scales.scale_height = 50;
					gantt.config.scales.min_column_width = 30;
				}
				case 'month': {
					gantt.config.scales.scale_height = 50;
					gantt.config.scales.min_column_width = 120;
				}
				case 'week': {
					gantt.config.scales.scale_height = 50;
					gantt.config.scales.min_column_width = 50;
				}
				case 'day': {
					gantt.config.scales.scale_height = 27;
					gantt.config.scales.min_column_width = 80;
				}
				default: {
					gantt.config.scales.scale_height = 27;
					gantt.config.scales.min_column_width = 80;
				}
			}
			gantt.config.scales = getScales(filterBy);
			gantt.render();

		});

		jQ.find('.toggle-CP').click(function () {
			if (gantt.config.highlight_critical_path) {
				gantt.config.highlight_critical_path = false;
				$(this).removeClass('btn-danger');
				console.log('Critical path is deactivated successfully');
			} else {
				gantt.config.highlight_critical_path = true;
				$(this).addClass('btn-danger');
				console.log('Critical path is activated successfully');
			}
			gantt.render();
		});

		jQ.find('.critical-path').click(function () {
			if (gantt.config.highlight_critical_path) {
				gantt.config.highlight_critical_path = false;
				$(this).removeClass('btn-danger');
				console.log('Critical path is deactivated successfully');
			} else {
				gantt.config.highlight_critical_path = true;
				$(this).addClass('btn-danger');
				console.log('Critical path is activated successfully');
			}
			gantt.render();
		});

		//export wbs
		jQ.find('.export-wbs').click(function () {
			console.log('calling export wbs');
			gantt.exportToExcel({
				name: "project_wbs.xlsx"
			});
		});

		//export wbs pdf
		jQ.find('.export-wbs-pdf').click(function () {
			console.log('calling export wbs pdf');
			gantt.exportToPDF({
				name: "project_wbs.pdf"
			});
		});

		//export wbs png
		jQ.find('.export-wbs-png').click(function () {
			console.log('calling export wbs png');
			gantt.exportToPNG({
				name: "project_wbs.png"
			});
		});

		//export wbs png
		jQ.find('.grid-view').click(function () {
			//console.log($(this).hasClass('menu-item-active'));
			$(this).removeClass('menu-item-active');
			$(this).parents('li').addClass('display-none');
			$('.timeline-view').parents('li').removeClass('display-none');

			gantt.config.layout = fullLayout;
			gantt.init("chart_div");
			gantt.render();
		});

		jQ.find('.timeline-view').click(function () {
			//console.log($(this).hasClass('menu-item-active'));			
			$(this).parents('li').addClass('display-none');
			$('.grid-view').parents('li').removeClass('display-none');
			$('.grid-view').addClass('menu-item-active');

			//V 7.0.9
			//if (gantt.config.layout === fullLayout) {
			//	gantt.config.layout = timelineLayout;
			//} else {
			//	gantt.config.layout = fullLayout;
			//}
			gantt.config.layout = timelineLayout;
			gantt.init("chart_div");
			gantt.render();
		});

		jQ.find('.zoom-in').click(function () {
			gantt.ext.zoom.zoomIn();
			gantt.$zoomToFit = false;
			document.querySelector(".zoom-fit").innerHTML = "Zoom to Fit";
		});

		jQ.find('.zoom-out').click(function () {
			gantt.ext.zoom.zoomOut();
			gantt.$zoomToFit = false;
			document.querySelector(".zoom-fit").innerHTML = "Zoom to Fit";
		});

		jQ.find('.zoom-fit').click(function () {
			console.log(gantt.$zoomToFit);
			gantt.$zoomToFit = !gantt.$zoomToFit;
			if (gantt.$zoomToFit) {
				$(this).innerHTML = "Set Default";
				//Saving previous scale state for future restore
				saveConfig();
				zoomToFit();
			} else {
				$(this).innerHTML = "Zoom to Fit";
				//Restore previous scale state
				restoreConfig();
				gantt.render();
			}
		});

		jQ.find('.full-screen').click(function () {
			gantt.ext.fullscreen.expand();
		});

		jQ.find('.collapse-all').click(function () {
			gantt.eachTask(function (task) {
				task.$open = false;
			});
			gantt.render();
		});

		jQ.find('.expand-all').click(function () {
			gantt.eachTask(function (task) {
				task.$open = true;
			});
			gantt.render();
		});
	}

	function zoomToFit() {
		console.log('calling zoomToFit function');
		var project = gantt.getSubtaskDates(),
			areaWidth = gantt.$task.offsetWidth,
			scaleConfigs = zoomConfig.levels;

		for (var i = 0; i < scaleConfigs.length; i++) {
			var columnCount = getUnitsBetween(project.start_date, project.end_date, scaleConfigs[i].scales[scaleConfigs[i].scales.length - 1].unit, scaleConfigs[i].scales[0].step);
			if ((columnCount + 2) * gantt.config.min_column_width <= areaWidth) {
				break;
			}
		}


		if (i == scaleConfigs.length) {
			i--;
		}

		gantt.ext.zoom.setLevel(scaleConfigs[i].name);
		applyConfig(scaleConfigs[i], project);
	}
	var cachedSettings = {};
	function saveConfig() {
		var config = gantt.config;
		cachedSettings = {};
		cachedSettings.scales = config.scales;
		cachedSettings.start_date = config.start_date;
		cachedSettings.end_date = config.end_date;
		cachedSettings.scroll_position = gantt.getScrollState();
	}
	function restoreConfig() {
		applyConfig(cachedSettings);
	}
	function applyConfig(config, dates) {

		gantt.config.scales = config.scales;
		var lowest_scale = config.scales.reverse()[0];

		if (dates && dates.start_date && dates.end_date) {
			gantt.config.start_date = gantt.date.add(dates.start_date, -1, lowest_scale.unit);
			gantt.config.end_date = gantt.date.add(gantt.date[lowest_scale.unit + "_start"](dates.end_date), 2, lowest_scale.unit);
		} else {
			gantt.config.start_date = gantt.config.end_date = null;
		}

		// restore the previous scroll position
		if (config.scroll_position) {
			setTimeout(function () {
				gantt.scrollTo(config.scroll_position.x, config.scroll_position.y)
			}, 4)
		}
	}
	// get number of columns in timeline
	function getUnitsBetween(from, to, unit, step) {
		var start = new Date(from),
			end = new Date(to);
		var units = 0;
		while (start.valueOf() < end.valueOf()) {
			units++;
			start = gantt.date.add(start, step, unit);
		}
		return units;
	}

	function toggleMode(toggle) {
		gantt.$zoomToFit = !gantt.$zoomToFit;
		if (gantt.$zoomToFit) {
			toggle.innerHTML = "Set default Scale";
			//Saving previous scale state for future restore
			saveConfig();
			zoomToFit();
		} else {

			toggle.innerHTML = "Zoom to Fit";
			//Restore previous scale state
			restoreConfig();
			gantt.render();
		}
	}

	var resourceMode = "hours";
	function shouldHighlightResource(resource) {
		var selectedTaskId = gantt.getState().selected_task;
		if (gantt.isTaskExists(selectedTaskId)) {
			var selectedTask = gantt.getTask(selectedTaskId),
				selectedResource = selectedTask[gantt.config.resource_property];

			if (resource.id === selectedResource) {
				return true;
			} else if (gantt.$resourcesStore.isChildOf(selectedResource, resource.id)) {
				return true;
			}
		}
		return false;
	}

	var taskClass = function (start, end, task) {
		//console.log('taskClass: ' + task.type);
		var css = [];
		if (task.type !== gantt.config.types.task) {
			css.push("hideElm");
			//css.push("gantt_critical_link");
		}
		return css.join(" ");
	};

	//testing custome css class adding
	var linkClass = function (link) {
		console.log('linkClass calling...');
		console.log('highlight_critical_path: ' + gantt.config.highlight_critical_path);
		if (gantt.isCriticalLink(link))
			return "gantt_critical_link";
		return "";
	};

	var gridRowClassFunc = function (start, end, task) {
		var css = [];
		if (gantt.hasChild(task.id)) css.push("folder_row");
		if (task.$virtual) css.push("group_row");
		if (shouldHighlightTask(task)) css.push("highlighted_resource");

		return css.join(" ");
	};

	var taskRowClassFunc = function (start, end, task) {
		return shouldHighlightTask(task) ? "highlighted_resource" : "";
	};

	var timelineCellClassFunc = function (task, date) {
		return !gantt.isWorkTime({ date: date, task: task }) ? "week_end" : "";
	};

	var resourceCellClassFunc = function (start_date, end_date, resource, tasks) {
		var css = [];
		css.push("resource_marker");
		if (tasks.length <= 1) css.push("workday_ok");
		else css.push("workday_over");

		return css.join(" ");
	};

	var resourceCellValueFunc = function (start_date, end_date, resource, tasks) {
		var html = "<div>";
		if (resourceMode === "hours") {
			var duration = 0;
			tasks.forEach(function (t) {
				duration += t.duration;
			});
			html += duration;
		}
		else html += tasks.length;

		html += "</div>";
		return html;
	};

	var shouldHighlightTask = function (task) {
		var store = gantt.$resourcesStore;
		var taskResource = task[gantt.config.resource_property],
			selectedResource = store.getSelectedId();

		if (taskResource === selectedResource || store.isChildOf(taskResource, selectedResource)) {
			return true;
		}
	};

	var onGanttReadyFunc = function () {
		console.log('calling onGanttReadyFunc....');
		var radios = [].slice.call(gantt.$container.querySelectorAll("input[type='radio']"));
		radios.forEach(function (r) {
			gantt.event(r, "change", function (e) {
				var radios = [].slice.call(gantt.$container.querySelectorAll("input[type='radio']"));
				radios.forEach(function (r) {
					r.parentNode.className = r.parentNode.className.replace("active", "");
				});

				if (this.checked) {
					resourceMode = this.value;
					this.parentNode.className += " active";
					gantt.getDatastore(gantt.config.resource_store).refresh();
				}
			});
		});
	};

	var getResourceTasks = function (resourceId) {
		var store = gantt.getDatastore(gantt.config.resource_store),
			field = gantt.config.resource_property,
			tasks;

		if (store.hasChild(resourceId)) {
			tasks = gantt.getTaskBy(field, store.getChildren(resourceId));
		} else {
			tasks = gantt.getTaskBy(field, resourceId);
		}
		return tasks;
	};

	var getResourceTemplates = function () {
		return {
			grid_row_class: function (start, end, resource) {
				var css = [];
				if (gantt.$resourcesStore.hasChild(resource.id)) {
					css.push("folder_row");
					css.push("group_row");
				}
				if (shouldHighlightResource(resource)) css.push("highlighted_resource");

				return css.join(" ");
			},
			task_row_class: function (start, end, resource) {
				var css = [];

				if (shouldHighlightResource(resource)) css.push("highlighted_resource");
				if (gantt.$resourcesStore.hasChild(resource.id)) css.push("group_row");

				return css.join(" ");

			}
		};
	};

	var onResourceParse = function () {
		var people = [];
		//console.log("calling onResourceParse...");
		gantt.$resourcesStore.eachItem(function (res) {
			//console.log(res);
			if (!gantt.$resourcesStore.hasChild(res.id)) {
				var copy = gantt.copy(res);
				copy.key = res.id;
				copy.label = res.text;
				people.push(copy);
			}
		});
		gantt.updateCollection("people", people);
	};	

	var tooltip = function (start, end, task) {
		var taskStatusClass = 'kanban-board-item-open';
		var taskHtml = '';
		if (task.$group_id) {
			taskHtml = "<div class='" + taskStatusClass + "' style='font-family:Verdana, Helvetica, Arial;font-size:12px;color:black;'><div>Full Name : " + task.text + "</div><div>Email : " + task.email + "</div><div>Phone : " + (task.phone || 'N/A') + "</div><div>Rate : " + (task.rate || 'N/A') + "</div><div>Position : " + (task.position || 'N/A') + "</div><div>Department : " + (task.department || 'N/A') + "</div></div>";
		} else if (task.type === gantt.config.types.task) {
			if (task.task_status === 'InProgress') taskStatusClass = 'kanban-board-item-progress';
			else if (task.task_status === 'Completed') taskStatusClass = 'kanban-board-item-completed';
			taskHtml = "<div class='" + taskStatusClass + "' style='font-family:Verdana, Helvetica, Arial;font-size:12px;color:black;'><div>" + task.code + " : " + task.text + "</div><div>Duration: " + task.duration_date + "</div><div>Estimated Hours: " + task.estimated_hours + "</div><div>Completed: " + task.completed_hours + "</div><div>Assigned By : " + task.assigned_by + "</div><div>Assigned To : " + task.assigned_to + "</div><div>Status : " + task.task_status_text + "</div></div>";
		} else if (task.type === gantt.config.types.project) {
			taskHtml = "<div class='" + taskStatusClass + "' style='font-family:Verdana, Helvetica, Arial;font-size:12px;color:black;'><div>" + task.code + " : " + task.text + "</div><div>Duration: " + task.duration_date + "</div><div>Estimated Hours: " + task.estimated_hours + "</div><div>Estimated Budget: " + task.assigned_by + "</div><div>Manager : " + task.assigned_to + "</div></div>";
		} else if (task.type === gantt.config.types.cmilestone) {
			taskHtml = "<div class='" + taskStatusClass + "' style='font-family:Verdana, Helvetica, Arial;font-size:12px;color:black;'><div>" + task.code + " : " + task.text + "</div><div>Duration: " + task.duration_date + "</div><div>Estimated Hours: " + task.estimated_hours + "</div></div>";
		}
		return taskHtml;
	};

	function setWorkTime(gantt) {
		gantt.setWorkTime({ day: 0, hours: [9, 17] });
		gantt.setWorkTime({ day: 1, hours: [9, 17] });
		gantt.setWorkTime({ day: 2, hours: [9, 17] });
		gantt.setWorkTime({ day: 3, hours: [9, 17] });
		gantt.setWorkTime({ day: 4, hours: [9, 17] });
		gantt.setWorkTime({ day: 5, hours: [9, 17] });
		gantt.setWorkTime({ day: 6, hours: [9, 17] });
		//gantt.setWorkTime({ day: 5, hours: false });
		//gantt.setWorkTime({ day: 6, hours: false });
	}

	var fullLayout = {
		css: "gantt_container",
		rows: [
			{
				gravity: 2,
				cols: [
					{
						width: 950,
						min_width: 600,
						rows: [
							{ view: "grid", scrollX: "gridScroll", scrollable: true, scrollY: "scrollVer" },
							{ view: "scrollbar", id: "gridScroll", group: "horizontal" }
						]
					},
					{ resizer: true, width: 1 },
					{
						rows: [
							{ view: "timeline", scrollX: "scrollHor", scrollY: "scrollVer" },
							{ view: "scrollbar", id: "scrollHor", group: "horizontal" }
						]
					},
					{ view: "scrollbar", id: "scrollVer" }
				]
			},
			{ resizer: true, width: 1, next: "resources" },
			{
				height: 35,
				cols: [
					{ html: "", group: "grids" },
					{ resizer: true, width: 1 },
					{
						html: "<label class='active' >Hours per day <input checked type='radio' name='resource-mode' value='hours'></label>" +
							"<label>Tasks per day <input type='radio' name='resource-mode' value='tasks'></label>", css: "resource-controls"
					}
				]
			},
			{
				gravity: 1,
				id: "resources",
				config: getResourceConfig(),
				templates: getResourceTemplates(),
				cols: [
					{ view: "resourceGrid", group: "grids", scrollY: "resourceVScroll" },
					{ resizer: true, width: 1 },
					{ view: "resourceTimeline", scrollX: "scrollHor", scrollY: "resourceVScroll" },
					{ view: "scrollbar", id: "resourceVScroll", group: "vertical" }
				]
			},
			{ view: "scrollbar", id: "scrollHor" }
		]
	};

	var timelineLayout = {
		css: "gantt_container",
		cols: [
			{
				rows: [
					{ view: "timeline", scrollX: "scrollHor", scrollY: "scrollVer" },
					{ view: "scrollbar", id: "scrollHor", group: "horizontal" }
				]
			},
			{ view: "scrollbar", id: "scrollVer" }
		]
	};

	function getGanttColumns() {
		return [
			{
				name: "text",
				label: "Project/Milestone/Task",
				width: 200,
				editor: editors.text,
				resize: true,
				tree: true
			},
			{
				name: "start_date_display",
				label: "Start Date",
				width: 90,
				editor: editors.start_date,
				resize: true,
				align: "center"
			},
			{
				name: "due_date_display",
				label: "Due Date",
				width: 90,
				editor: editors.due_date,
				resize: true,
				align: "center"
			},
			{
				name: "duration_hours",
				label: "Hours",
				align: "center",
				width: 100,
				editor: editors.duration,
				resize: true
			},
			{
				name: "task_description",
				label: "Description",
				width: 200,
				align: "left",
				editor: editors.description,
				resize: true
			},
			{
				name: "user_id",
				label: "Assigned To",
				width: 120,
				align: "center",
				editor: editors.resource,
				template: resourceLabel,
				resize: true
			},
			{
				name: "task_priority",
				label: "Priority",
				width: 80,
				align: "center",
				editor: editors.priority,
				template: priorityLabel,
				resize: true
			},
			{
				name: "task_status",
				label: "Status",
				width: 80,
				align: "center",
				//editor: editors.status,
				template: statusLabel,
				resize: true
			},
			{
				name: "did",
				label: "Predecessors",
				width: 200,
				align: "center",
				editor: editors.dependent_task,
				template: function (task) {
					if (task.did) {
						var links = task.$target;
						var server_list = gantt.serverList("projecttask");
						var grid_value = [];
						for (var i = 0; i < links.length; i++) {
							console.log('Predecessors -> links[' + i + '] = ' + links[i]);
							var dependent_task_id = gantt.getLink(links[i]).dependent_task_id;
							console.log('Predecessors -> dependent_task_id: ' + dependent_task_id);
							for (var j = 0; j < server_list.length; j++) {
								if (dependent_task_id === server_list[j].key) {
									grid_value.push(server_list[j].label);
									console.log(server_list[j].label);
								}
							}
						}
						return grid_value;
					}
					else return "";
				},
				resize: true
			},
			{
				name: "material_type_id",
				label: "Material Type",
				width: 120,
				align: "center",
				template: materialTypeLabel,
				resize: true
			},
			{
				name: "material_type_unit",
				label: "Unit/Qty",
				width: 100,
				align: "center",
				resize: true
			},
			{
				name: "machines_type_id",
				label: "Machines Type",
				width: 120,
				align: "center",
				template: machinesTypeLabel,
				resize: true
			},
			{
				name: "machines_type_unit",
				label: "Unit/Qty",
				width: 100,
				align: "center",
				resize: true
			},
			{
				name: "miscellaneous_type_id",
				label: "Misc Type",
				width: 120,
				align: "center",
				template: miscellaneousTypeLabel,
				resize: true
			},
			{
				name: "miscellaneous_type_unit",
				label: "Unit/Qty",
				width: 100,
				align: "center",
				resize: true
			},
			{
				name: "fixed_cost",
				label: "Fixed Cost",
				width: 100,
				align: "right",
				resize: true
			},	
			{
				name: "total_cost",
				label: "Total",
				width: 100,
				align: "right",
				resize: true
			},
			//{
			//	name: "add_custom",
			//	label: `<div class='custom_add2 root-plus' onclick=WBS_BULK_TASK.customAdd('header')></div>`,
			//	width: 60,
			//	align: "center",
			//	template: function (task) {
			//		if (task.custom_type === 'sub-task') return '';
			//		return `<div class='custom_add2' onclick=WBS_BULK_TASK.customAdd('grid','${task.id}')></div>`;
			//	}
			//},
			{
				name: "add_custom",
				label: '',
				width: 60,
				template: function (task) {
					if (task.custom_type === 'sub-task')
						return '<i class="fa fa-times" data-action="delete"></i>';
					else
						return '<i class="fa fa-plus" data-action="add"></i><i class="fa fa-times" data-action="delete"></i>';
				}
			}
		];
	}

	function getResourceConfig() {
		return {
			scale_height: 30,
			scales: [
				{ unit: "day", step: 1, date: "%d %M" }
			],
			columns: [
				{
					name: "name", label: "Name", tree: true, width: 200, template: function (resource) {
						return resource.text;
					}, resize: true
				},
				{
					name: "progress", label: "Complete", align: "center", template: function (resource) {
						var tasks = getResourceTasks(resource.id);

						var totalToDo = 0,
							totalDone = 0;
						tasks.forEach(function (task) {
							totalToDo += task.duration;
							totalDone += task.duration * (task.progress || 0);
						});

						var completion = 0;
						if (totalToDo) {
							completion = Math.floor((totalDone / totalToDo) * 100);
						}

						return Math.floor(completion) + "%";
					}, resize: true
				},
				{
					name: "workload", label: "Workload", align: "center", template: function (resource) {
						var tasks = getResourceTasks(resource.id);
						var totalDuration = 0;
						tasks.forEach(function (task) {
							totalDuration += task.duration;
						});

						return (totalDuration || 0) * 8 + "h";
					}, resize: true
				},
				{
					name: "capacity", label: "Capacity", align: "center", template: function (resource) {
						var store = gantt.getDatastore(gantt.config.resource_store);
						var n = store.hasChild(resource.id) ? store.getChildren(resource.id).length : 1;
						var state = gantt.getState();
						return gantt.calculateDuration(state.min_date, state.max_date) * n * 8 + "h";
					}
				}
			]
		};
	}
	
	//ADD TASK
	function getTaskStatusList() {
		return [
			{ key: 0, label: "Open" },
			{ key: 1, label: "In Progress" },
			{ key: 2, label: "Completed" }
		];
	}

	function statusLabel(task) {
		var value = task.task_status;
		var list = getTaskStatusList();
		for (var i = 0; i < list.length; i++) {
			if (list[i].key === value) {
				return list[i].label;
			}
		}
		return "";
	}

	//Mapped with server-side
	function getTaskPriorities() {
		return [
			{ key: 0, label: "Low" },
			{ key: 1, label: "Moderate" },
			{ key: 2, label: "High" }
		];
	}

	function priorityLabel(task) {
		//console.log(task);
		var value = task.task_priority;
		var list = getTaskPriorities();
		for (var i = 0; i < list.length; i++) {
			if (list[i].key === value) {
				return list[i].label;
			}
		}
		return "";
	}

	function resourceLabel(task) {
		//console.log('calling resourceLabel: ' + JSON.stringify(task));
		var value = task.user_id;
		var list = gantt.serverList("people");
		for (var i = 0; i < list.length; i++) {
			if (list[i].key === value) {
				return list[i].label;
			}
		}
		return "";
	}
	
	function materialTypeLabel(task) {
		var value = task.material_type_id;
		var list = gantt.serverList("materialtype");
		//console.log('materialTypeLabel-> value: ' + value + ', list: ' + JSON.stringify(list));
		for (var i = 0; i < list.length; i++) {
			if (list[i].key === value) {
				return list[i].label;
			}
		}
		return "";
	}

	function machinesTypeLabel(task) {
		var value = task.machines_type_id;
		var list = gantt.serverList("machinestype");
		for (var i = 0; i < list.length; i++) {
			if (list[i].key === value) {
				return list[i].label;
			}
		}
		return "";
	}

	function miscellaneousTypeLabel(task) {
		var value = task.miscellaneous_type_id;
		var list = gantt.serverList("miscellaneoustype");
		for (var i = 0; i < list.length; i++) {
			if (list[i].key === value) {
				return list[i].label;
			}
		}
		return "";
	}

	var customAdd = function (type, id, project) {
		//console.log('calling customAdd with type: ' + type + ', id:' + id);
		var newId = +new Date();
		//New Milestone
		if (type === 'header') {
			gantt.createTask({ id: newId, start_date: selectedProject.start_date, duration: 1, text: "New Milestone", type: gantt.config.types.cmilestone, project_id: selectedProject.did });
			return;
		}

		//New Task or New Sub-Task
		var parentTask = gantt.getTask(id);
		milestoneId = parentTask.milestone_id;
		parentTaskId = parentTask.did;
		console.log('customAdd -> + button click with parentTask: ' + JSON.stringify(parentTask));
		var startDate = parentTask.start_date;
		if (parentTask.type === gantt.config.types.cmilestone || parentTask.$group_id) {
			var task = { id: newId, start_date: startDate, duration: 1, text: "New Task", type: "task", milestone_id: parentTask.did, project_id: parentTask.project_id };
			if (parentTask.$group_id) task.user_id = parentTask.$group_id;
			gantt.createTask(task, id);
		} else if (parentTask.type === 'task') {
			gantt.createTask({ id: newId, start_date: startDate, duration: 1, text: "New Sub-Task", project_id: parentTask.project_id, milestone_id: milestoneId, parent_task_id: parentTaskId }, id);
		} else {
			return;
		}
	};

	var onBeforeLightbox = function (id, data) {
		//console.log('calling onBeforeLightbox');
		var task = gantt.getTask(id);
		//-1: for other milestone
		if (task.type === 'project' || task.did===-1) return false;

		if (task.progress === 1) return false;

		if (task.task_status === 0) task.task_status = undefined;
		if (task.task_priority === 0) task.task_priority = undefined;

		setTimeout(function () {
			var delete_button = document.querySelector(".gantt_delete_btn_set");
			if (!delete_button) return;

			if (typeof id === 'number') delete_button.style.display = 'none';
			else delete_button.style.display = 'block';
		}, 200);

		return true;
	};

	//Start: APIs
	//START: Add or Update
	var onLightboxSaveFunc = function (id, item, isNew) {
		//console.log('calling onLightboxSaveFunc');
		switch (item.$rendered_type) {
			case gantt.config.types.task:
				createOrUpdateTask(item, id, isNew);
				break;
			case gantt.config.types.cmilestone:
				createOrUpdateMilestone(item, id, isNew);
				break;
		}
		return false;
	};

	function generateTask(data, id, isNew, columnName) {
		console.log('calling generateTask with data: ' + JSON.stringify(data) + ', id: ' + id + ', isNew:' + isNew + ', columnName:' + columnName);
		if (!isNew) {
			var task = gantt.getTask(id);
			id = task.did;
		} else {
			id = 0;
		}
		return {
			Id: id,
			ProjectId: data.project_id || selectedProject.did,
			ProjectMilestoneId: data.milestone_id,
			MilestoneCode: data.parent_task_id ? "" : data.parent,
			ParentTaskId: data.parent_task_id ? data.parent_task_id : null,
			Name: data.text,
			Description: data.task_description ? data.task_description : "",
			StartDate: columnName === 'start_date_display' && !isNew ? moment(data.start_date_display).add(1, 'd').toISOString() : moment(data.start_date).toISOString(),
			EndDate: columnName === 'due_date_display' && !isNew ? moment(data.due_date_display).add(1, 'd').toISOString() : moment(data.due_date).toISOString(),
			//StartDate: moment(data.start_date).format(),
			////EndDate: data.type === gantt.config.types.cmilestone ? moment(data.end_date).format() : moment(data.due_date,'yyyy-MM-dd').format(),
			//EndDate: moment(data.end_date).format(),
			//EndDate: moment(data.end_date, 'DD-MM-YYYY').format(),
			EstimatedHoursH: parseInt(data.duration_hours),
			EstimatedHoursM: parseInt(data.duration_mins),
			Priority: parseInt(data.task_priority),
			ResourceId: parseInt(data.user_id),
			Status: parseInt(data.task_status)
		};
	}

	function handleAddOrUpdateResponse(response, tempTaskId, isNew) {
		console.log('calling handleAddOrUpdateResponse with response: ' + JSON.stringify(response.Data) + ', tempTaskId: ' + tempTaskId + ', isNew:' + isNew);
		if (response.IsSuccess) {
			var data = response.Data;
			gantt.hideLightbox();
			data.start_date = generateDateFromString(data.start_date);
			data.end_date = generateDateFromString(data.end_date);	
			if (data.type === gantt.config.types.cmilestone) data.duration = null;	

			if (isNew) {
				if (gantt.isTaskExists(tempTaskId)) { 					
					gantt.deleteTask(tempTaskId);
				} 
				gantt.addTask(data);
			} else {
				var taskToUpdate = gantt.getTask(data.id);
				taskToUpdate.start_date = data.start_date;
				taskToUpdate.end_date = data.end_date;
				taskToUpdate.due_date = data.due_date;
				//if (data.type !== 'cmilestone' && taskToUpdate.duration !== data.duration) taskToUpdate.duration = data.duration;
				if (taskToUpdate.duration_hours !== data.duration_hours) taskToUpdate.duration_hours = data.duration_hours;
				if (taskToUpdate.duration_mins !== data.duration_mins) taskToUpdate.duration_mins = data.duration_mins;
				if (taskToUpdate.text !== data.text) taskToUpdate.text = data.text;
				if (taskToUpdate.open !== data.open) taskToUpdate.open = data.open;
				if (taskToUpdate.project_id !== data.project_id) taskToUpdate.project_id = data.project_id;
				if (taskToUpdate.milestone_id !== data.milestone_id) taskToUpdate.milestone_id = data.milestone_id;
				if (taskToUpdate.parent_task_id !== data.parent_task_id) taskToUpdate.parent_task_id = data.parent_task_id;

				if (taskToUpdate.task_status !== data.task_status) taskToUpdate.task_status = data.task_status;
				if (taskToUpdate.task_status_text !== data.task_status_text) taskToUpdate.task_status_text = data.task_status_text;
				if (taskToUpdate.task_priority !== data.task_priority) taskToUpdate.task_priority = data.task_priority;
				if (taskToUpdate.duration_date !== data.duration_date) taskToUpdate.duration_date = data.duration_date;
				if (taskToUpdate.assigned_to !== data.assigned_to) taskToUpdate.assigned_to = data.assigned_to;
				if (taskToUpdate.user_id !== data.user_id) taskToUpdate.user_id = data.user_id;
				if (taskToUpdate.estimated_hours !== data.estimated_hours) taskToUpdate.estimated_hours = data.estimated_hours;
				if (taskToUpdate.completed_hours !== data.completed_hours) taskToUpdate.completed_hours = data.completed_hours;
				if (taskToUpdate.task_description !== data.task_description) taskToUpdate.task_description = data.task_description;
				if (taskToUpdate.start_date_display !== data.start_date_display) taskToUpdate.start_date_display = data.start_date_display;
				if (taskToUpdate.due_date_display !== data.due_date_display) taskToUpdate.due_date_display = data.due_date_display;
				
				if (taskToUpdate.textColor !== data.textColor) taskToUpdate.textColor = data.textColor;
				if (taskToUpdate.color !== data.color) taskToUpdate.color = data.color;

				gantt.updateTask(data.id);
			}

			gantt.message({ text: response.Message, type: "success" });
		}
		else {
			gantt.message({ text: response.Message, type: "error" });
		}
	}

	var createOrUpdateTask = function (data, id, isNew, columnName) {		
		var task = generateTask(data, id, isNew, columnName);
		console.log('calling createOrUpdateTask with generated task: ' + JSON.stringify(task) + ', id: ' + id + ', isNew:' + isNew + ', columnName: ' + columnName);
		$.ajax({
			url: '/PMO/Task/AddOrUpdateScheduleTaskAjax?inputField=' + columnName,
			type: 'POST',
			data: JSON.stringify(task),
			dataType: 'json',
			contentType: "application/json",
			beforeSend: function () {
				if (isNew) {
					$("#loader").show();
				}
			},
			success: function (response) {
				handleAddOrUpdateResponse(response, id, isNew);
			},
			complete: function (data) {
				if (isNew) {
					$("#loader").hide();
				}
			},
			error: function () {
				gantt.message({ text: "Failed to add task", type: "error" });
			}
		});
	};

	function generateMilestone(data, id, isNew, columnName) {
		console.log('generateMilestone with data: ' + JSON.stringify(data) + ', ' + id + ', isNew: ' + isNew + ', columnName: ' + columnName);
		if (!isNew) {
			var milestone = gantt.getTask(id);
			id = milestone.did;
		} else {
			id = 0;
		}
		return {
			Id: id,
			ProjectId: data.project_id,
			Name: data.text,
			Description: data.task_description ? data.task_description : "",
			StartDate: columnName === 'start_date_display' ? moment(data.start_date_display).add(1, 'd').toISOString() : moment(data.start_date).toISOString(),
			EndDate: columnName === 'due_date_display' ? moment(data.due_date_display).add(1, 'd').toISOString() : moment(data.end_date).toISOString(),
			EstimatedHours: parseInt(data.duration_hours)
		};
	}

	var createOrUpdateMilestone = function (data, id, isNew, columnName) {
		var milestone = generateMilestone(data, id, isNew, columnName);
		console.log("createOrUpdateMilestone generated milestone: " + JSON.stringify(milestone) + ', id: ' + id + ', isNew:' + isNew + ', columnName: ' + columnName);
		$.ajax({
			url: '/PMO/Milestone/AddOrUpdateScheduleMilestoneAjax',
			type: 'POST',
			data: JSON.stringify(milestone),
			dataType: 'json',
			contentType: "application/json",
			beforeSend: function () {
				if (isNew) {
					$("#loader").show();
				}
			},
			success: function (response) {
				handleAddOrUpdateResponse(response, id, isNew);
			},
			complete: function (data) {
				if (isNew) {
					$("#loader").hide();
				}
			},
			error: function () {
				gantt.message({ text: "Failed to add Milestone", type: "error" });
			}
		});
	};

	//START: Delete
	var onLightboxDeleteFunc = function (id) {
		gantt.confirm({
			text: "do you want to delete?",
			ok: "yes",
			cancel: "no",
			callback: function (result) {
				if (!result) return;

				var task = gantt.getTask(id);
				if (!task) return;

				switch (task.type) {
					case "task":
						deteletTask(id);
						break;
					case "cmilestone":
						deteletMilestone(id);
						break;
					//case "project":
					//	deteletProject(id);
					//	break;
				}
			}
		});
	};

	var handleDeleteResponse = function (response, id) {
		gantt.hideLightbox();
		if (!response.IsSuccess) {
			gantt.message({ text: response.Message, type: "error" });
			return;
		}

		gantt.deleteTask(id);
		gantt.message({ text: response.Message, type: "success" });
	};

	var deteletTask = function (id) {
		var task = gantt.getTask(id);
		$.ajax({
			url: `/PMO/Task/DeleteScheduleTaskAjax/${task.did}`,
			type: 'DELETE',
			dataType: 'json',
			contentType: "application/json",
			success: function (response) {
				handleDeleteResponse(response, id);
			},
			error: function () {
				gantt.message({ text: "Failed to delete Task", type: "error" });
			}
		});
	};

	var deteletMilestone = function (id) {
		var milestone = gantt.getTask(id);
		$.ajax({
			url: `/PMO/Milestone/DeleteAjax/${milestone.did}`,
			type: 'DELETE',
			dataType: 'json',
			contentType: "application/json",
			success: function (response) {
				handleDeleteResponse(response, id);
			},
			error: function () {
				gantt.message({ text: "Failed to delete task", type: "error" });
			}
		});
	};

	//START: Task Drag
	var dragTask;
	//"resize", "progress", "move", "ignore"
	var beforeDrag = function (id, mode, task, original) {
		dragTask = Object.assign({}, gantt.getTask(id));
		if (dragTask.type === gantt.config.types.project) return false;

		if ((mode === 'resize' || mode === 'move') && gantt.getTask(id).progress === 1) {
			return false;
		}

		return true;
	};

	var afterTaskDrag = function (id, mode, e) {
		console.log(mode);
		if (mode === 'resize' || mode === 'move') updateTaskOnDrag(id);
		else if (mode === 'progress') updateProgress(id);

		console.log("onAfterTaskDrag", id, mode, e);
	};

	function limitMoveLeft(task, limit) {
		var dur = task.end_date - task.start_date;
		task.end_date = new Date(limit.end_date);
		task.start_date = new Date(+task.end_date - dur);
	}

	function limitMoveRight(task, limit) {
		var dur = task.end_date - task.start_date;
		task.start_date = new Date(limit.start_date);
		task.end_date = new Date(+task.start_date + dur);
	}

	function limitResizeLeft(task, limit) {
		task.end_date = new Date(limit.end_date);
	}

	function limitResizeRight(task, limit) {
		task.start_date = new Date(limit.start_date);
	}

	var onTaskDrag = function (id, mode, task, original, e) {
		var parent = task.parent ? gantt.getTask(task.parent) : null,
			children = gantt.getChildren(id),
			modes = gantt.config.drag_mode;

		var limitLeft = null,
			limitRight = null;

		if (!(mode === modes.move || mode === modes.resize)) return;

		if (mode === modes.move) {
			limitLeft = limitMoveLeft;
			limitRight = limitMoveRight;
		} else if (mode === modes.resize) {
			limitLeft = limitResizeLeft;
			limitRight = limitResizeRight;
		}

		//check parents constraints
		if (parent && +parent.end_date < +task.end_date) {
			limitLeft(task, parent);
		}
		if (parent && +parent.start_date > +task.start_date) {
			limitRight(task, parent);
		}

		//check children constraints
		for (var i = 0; i < children.length; i++) {
			var child = gantt.getTask(children[i]);
			if (+task.end_date < +child.end_date) {
				limitLeft(task, child);
			} else if (+task.start_date > +child.start_date) {
				limitRight(task, child);
			}
		}
	};

	function generateDragTask(task) {
		var hours = task.duration * gantt.config.duration_step;
		var mins = (hours - Math.floor(hours))*60;
		return {
			Id: task.did,
			StartDate: task.start_date,
			EstimatedHoursH: parseInt(hours),
			EstimatedHoursM: parseInt(mins),
			MilestoneCode: task.parent_task_id ? "" : task.parent,
			ParentTaskId: task.parent_task_id ? task.parent_task_id : null
		};
	}

	function generateDragMilestone(milestone) {
		return {
			Id: milestone.did,
			StartDate: milestone.start_date,
			EstimatedHours: parseInt(milestone.duration * gantt.config.duration_step),
			EndDate: milestone.end_date
		};
	}

	function revertTaskDrag(id, oldTask, message) {
		var task = gantt.getTask(id);
		task.start_date = oldTask.start_date;
		task.end_date = oldTask.end_date;
		gantt.updateTask(id);

		gantt.message({ text: message, type: "error" });
	}

	var updateTaskOnDrag = function (id) {
		var model = gantt.getTask(id);
		var data = model.type === gantt.config.types.cmilestone ? generateDragMilestone(model) : generateDragTask(model);
		var url = model.type === gantt.config.types.cmilestone ? '/PMO/Milestone/UpdateDurationAjax' : '/PMO/Task/UpdateDurationAjax';
		$.ajax({
			url: url,
			type: 'POST',
			data: JSON.stringify(data),
			dataType: 'json',
			contentType: "application/json",
			success: function (response) {
				if (response.IsSuccess) {
					handleAddOrUpdateResponse(response, undefined, false);
					return;
				}
				revertTaskDrag(id, dragTask, response.Message);
			},
			error: function () {
				revertTaskDrag(id, dragTask, 'Failed to update');
			}
		});
	};

	//Update Progress
	function getProgressData(task) {
		return {
			Id: task.did,
			ProgressInPercentage: task.progress,
			MilestoneCode: task.parent_task_id ? '' : task.parent
		};
	}

	function revertTaskProgress(id, oldTask, message) {
		var task = gantt.getTask(id);
		task.progress = oldTask.progress;
		gantt.updateTask(id);

		gantt.message({ text: message, type: "error" });
	}

	var updateProgress = function (id) {
		var model = gantt.getTask(id);
		var data = getProgressData(model);
		$.ajax({
			url: '/PMO/Task/UpdateTaskProgressAjax',
			type: 'POST',
			data: JSON.stringify(data),
			dataType: 'json',
			contentType: "application/json",
			success: function (response) {
				if (response.IsSuccess) {
					handleAddOrUpdateResponse(response, undefined, false);
					return;
				}
				revertTaskProgress(id, dragTask, response.Message);
			},
			error: function () {
				revertTaskProgress(id, dragTask, 'Failed to update');
			}
		});
	};

	//Add Links
	//var onLinkValidation = function (link) {
	//	if (link.type !== '0') {
	//		gantt.message({ text: 'Only end to start link support.', type: "error" });
	//		return false;
	//	}
	//	return true;
	//};
	
	var onBeforeLinkAdd = function (id, link) {
		console.log('calling onBeforeLinkAdd with id: ' + id + ', link: ' + JSON.stringify(link));
		if (link.type !== '0') {
			gantt.message({ text: 'Only end to start link support.', type: "error" });
			return false;
		}

		//var isCircular = gantt.isCircularLink(link);
		//if (isCircular) {
		//	gantt.message({ text: 'Detect circular dependency.', type: "error" });
		//	return false;
		//}

		var sourceTask = gantt.getTask(link.source);
		var targetTask = gantt.getTask(link.target);

		//console.log(+sourceTask.end_date + '>= ' + +targetTask.start_date);
		if (+sourceTask.end_date >= +targetTask.start_date) {
			gantt.message({ text: 'Editd Start Date of Target Task should be greater than End Date of Source Task.', type: "error" });
			return false;
		}
	};

	var onAfterLinkAdd = function (id, item) {
		console.log('calling onAfterLinkAdd with id: ' + id + ', item: ' + JSON.stringify(item));
		if (typeof id !== 'number') return;

		var source = gantt.getTask(item.source);
		var target = gantt.getTask(item.target);
		//console.log('calling onAfterLinkAdd with item.source: ' + item.source + ', source: ' + JSON.stringify(source));
		//console.log('calling onAfterLinkAdd with item.target: ' + item.target + ', target: ' + JSON.stringify(target));
		var data = {
			Id: typeof item.project_task_id === 'undefined' ? target.did : item.dependent_task_id,
			DependentTaskId: typeof item.dependent_task_id === 'undefined' ? source.did : item.project_task_id
		};
		//var data = {
		//	Id: item.project_task_id,
		//	DependentTaskId: item.dependent_task_id
		//};
		addNewLink(id, data, item.target, item.source);
	};

	var revertAddLink = function (linkId) {
		gantt.deleteLink(linkId);
		gantt.message({ text: 'Failed to add Dependent Task', type: "error" });
	};

	var addNewLink = function (linkId, data, targetTaskId, sourceTaskId) {
		console.log('calling addNewLink with linkId: ' + linkId + ', data' + JSON.stringify(data) + ', targetTaskId:' + targetTaskId + ', sourceTaskId: ' + sourceTaskId);
		$.ajax({
			url: '/PMO/Task/AddDependentTaskAjax',
			type: 'POST',
			data: JSON.stringify(data),
			dataType: 'json',
			contentType: "application/json",
			success: function (response) {
				if (response.IsSuccess) {
					//console.log('addNewLink -> using linkId: ' + JSON.stringify(gantt.getLink(linkId)));
					gantt.changeLinkId(linkId, response.Data.id);
					//console.log('addNewLink -> using response.Data.id: ' + JSON.stringify(gantt.getLink(response.Data.id)));
					//var task = gantt.getTask(taskId);
					//console.log('addNewLink task.$target: ' + JSON.stringify(task.$target));
					//gantt.refreshTask(data.Id);
					gantt.refreshTask(targetTaskId);
					gantt.refreshTask(sourceTaskId);
					gantt.message({ text: response.Message, type: "success" });
					return;
				}
				revertAddLink(linkId);
			},
			error: function () {
				revertAddLink(linkId);
			}
		});
	};

	var addNewLinkDetails = function (linkId, data) {
		console.log('calling addNewLinkDetails with linkId: ' + linkId + ', data' + JSON.stringify(data));
		$.ajax({
			url: '/PMO/Task/GetDependentTaskDetails',
			type: 'POST',
			data: JSON.stringify(data),
			dataType: 'json',
			contentType: "application/json",
			success: function (response) {
				if (response.IsSuccess) {
					var link = {
						id: linkId,
						type: '0',
						source: response.Data.source,
						target: response.Data.target,
						project_task_id: data.DependentTaskId,
						dependent_task_id: data.Id
					};
					console.log('addNewLinkDetails :' + JSON.stringify(link));
					gantt.addLink(link);
				}
			},
			error: function () {
				gantt.message({ text: 'Failed to add Dependent Task', type: "error" });
			}
		});
	};

	//Delete Link
	var onAfterLinkDelete = function (id, item) {
		if (typeof id === 'number') return;
		deleteLink(id, item);
	};

	var revertDeleteLink = function (link) {
		gantt.addLink(link);
		gantt.message({ text: 'Failed to delete Dependent Task', type: "error" });
	};

	var deleteLink = function (linkId, link) {
		var url = `/PMO/Task/RemoveTaskDependencyAjax/${parseInt(linkId)}`;
		$.ajax({
			url: url,
			type: 'DELETE',
			dataType: 'json',
			contentType: "application/json",
			success: function (response) {
				if (response.IsSuccess) {
					gantt.message({ text: response.Message, type: "success" });
					return;
				}
				revertDeleteLink(link);
			},
			error: function () {
				revertDeleteLink(link);
			}
		});
	};

	function generateDateFromString(value) {
		if (!value) return null;
		var date = new Date(value.substr(6, 4), value.substr(3, 2)-1, value.substr(0, 2), value.substr(11, 2), value.substr(14, 2));
		return date;
	}

	function toggleGroups(input) {
		gantt.$groupMode = !gantt.$groupMode;
		if (gantt.$groupMode) {
			//input.value = "show gantt view";
			$('#wbs_bulk_task').addClass('chart-root');

			var groups = gantt.$resourcesStore.getItems().map(function (item) {
				var group = gantt.copy(item);
				group.group_id = group.id;
				group.id = gantt.uid();
				return group;
			});

			gantt.groupBy({
				groups: groups,
				relation_property: gantt.config.resource_property,
				group_id: "group_id",
				group_text: "text"
			});
		} else {
			$('#wbs_bulk_task').removeClass('chart-root');
			gantt.groupBy(false);
		}
	}

	plugin.toggleGroups = toggleGroups;
	plugin.customAdd = customAdd;
	plugin.init = init;
})(WBS_BULK_TASK);





