import type { ModelType } from '@typegoose/typegoose/lib/types'
import { getModelForClass } from '@typegoose/typegoose'

import { OrderList } from './Orders/Orders'
import { StaticTask } from './Task/Types/Static'
import { DynamicTask } from './Task/Types/Dynamic'
import { User } from './User/User'
import { Task } from './Task/Task'
import { TaskList } from './Task/TaskList'
import { Guild } from './Guild/Guild'
import { Rating } from './MatchMaking/Rating'
import { MatchList } from './MatchMaking/MatchList'
import { ReportList } from './MatchMaking/Reports'

export const UserModel = getModelForClass(User)
export const TaskModel = getModelForClass(Task)
export const TaskListModel = getModelForClass(TaskList)
export const GuildModel = getModelForClass(Guild)
export const RatingModel = getModelForClass(Rating)
export const ReportListModel = getModelForClass(ReportList)
export const MatchListModel = getModelForClass(MatchList)
export const OrderListModel = getModelForClass(OrderList)
export const StaticTaskModel = getModelForClass(StaticTask)
export const DynamicTaskModel = getModelForClass(DynamicTask)

export const MODELS: Map<string, ModelType<any, any>> = new Map()
MODELS.set(UserModel.modelName, UserModel)
MODELS.set(TaskModel.modelName, TaskModel)
MODELS.set(TaskListModel.modelName, TaskListModel)
MODELS.set(GuildModel.modelName, GuildModel)
MODELS.set(RatingModel.modelName, RatingModel)
MODELS.set(ReportListModel.modelName, ReportListModel)
MODELS.set(MatchListModel.modelName, MatchListModel)
MODELS.set(OrderListModel.modelName, OrderListModel)
MODELS.set(StaticTaskModel.modelName, StaticTaskModel)
MODELS.set(DynamicTaskModel.modelName, DynamicTaskModel)
