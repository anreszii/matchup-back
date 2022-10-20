import type { ModelType } from '@typegoose/typegoose/lib/types'
import { getModelForClass } from '@typegoose/typegoose'
import { User } from './User'
import { TaskList, Task } from './Task'
import { Guild } from './Guild'
import { Rating, MatchList, ReportList } from './MatchMaking'
import { OrderList } from './Orders/Orders'

export const UserModel = getModelForClass(User)
export const TaskModel = getModelForClass(Task)
export const TaskListModel = getModelForClass(TaskList)
export const GuildModel = getModelForClass(Guild)
export const RatingModel = getModelForClass(Rating)
export const ReportListModel = getModelForClass(ReportList)
export const MatchListModel = getModelForClass(MatchList)
export const OrderListModel = getModelForClass(OrderList)

export * from './User'
export * from './Task'
export * from './Guild'
export * from './MatchMaking'
export * from './GlobalStatistic'
export * from './Reward'

export const Models: Map<string, ModelType<any, any>> = new Map()
Models.set(UserModel.modelName, UserModel)
Models.set(TaskModel.modelName, TaskModel)
Models.set(TaskListModel.modelName, TaskListModel)
Models.set(GuildModel.modelName, GuildModel)
Models.set(RatingModel.modelName, RatingModel)
Models.set(ReportListModel.modelName, ReportListModel)
Models.set(MatchListModel.modelName, MatchListModel)
Models.set(OrderListModel.modelName, OrderListModel)
