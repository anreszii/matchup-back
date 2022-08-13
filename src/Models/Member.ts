import { Schema } from 'mongoose'
import type { rewardType } from '../app'
import { Member } from '../MatchMaking'

export const MemberSchema = new Schema<Member>({})
