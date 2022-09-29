import { getModelForClass } from '@typegoose/typegoose'
import { User } from './User'
import { TaskList, Task } from './Task'
import { Guild } from './Guild'
import { Rating, MatchList, ReportList } from './MatchMaking'

export const UserModel = getModelForClass(User)
export const TaskModel = getModelForClass(Task)
export const TaskListModel = getModelForClass(TaskList)
export const GuildModel = getModelForClass(Guild)
export const RatingModel = getModelForClass(Rating)
export const ReportListModel = getModelForClass(ReportList)
export const MatchListModel = getModelForClass(MatchList)

export * from './User'
export * from './Task'
export * from './Guild'
export * from './MatchMaking'
export * from './GlobalStatistic'
export * from './Reward'
