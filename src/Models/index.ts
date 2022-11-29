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
import { Chat } from './Chat/Chat'
import { PERIODS } from './User/Premium'
import { Leaderboard } from './Leaderboard/Leaderboar'
import { DAY_IN_MS } from '../configs/time_constants'
import { NotificationQueue } from './User/Notify/Queue'

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
export const ChatModel = getModelForClass(Chat)
export const NotificationModel = getModelForClass(NotificationQueue)

const LeaderboardModel = getModelForClass(Leaderboard)
setInterval(() => {
  LeaderboardModel.find({}).then((boards) => {
    for (let board of boards) board.updateLeaderboard()
  })
}, DAY_IN_MS)

export * from './Orders/Orders'
export * from './Task/Types/Static'
export * from './Task/Types/Dynamic'
export * from './User/User'
export * from './User/Notify/Queue'
export * from './User/Notify/Notify'
export * from './Task/Task'
export * from './Task/TaskList'
export * from './Guild'
export * from './MatchMaking/Rating'
export * from './MatchMaking/MatchList'
export * from './MatchMaking/Reports'
export * from './Chat/Chat'

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
MODELS.set(ChatModel.modelName, ChatModel)
MODELS.set(LeaderboardModel.modelName, LeaderboardModel)
MODELS.set(NotificationModel.modelName, NotificationModel)
MODELS.set(PERIODS.modelName, PERIODS)
