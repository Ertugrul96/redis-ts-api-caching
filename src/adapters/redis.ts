import {Logger} from '@aws-lambda-powertools/logger'
import {RedisClientType} from 'redis'
import {RedisCache} from '../ports'

interface RedisConfig {
  logger: Logger
  client: RedisClientType
  defaultTtlSeconds?: number
}

const existsInCache =
  (config: RedisConfig) =>
    async (cacheKey: string | undefined): Promise<boolean> => {
      if (!cacheKey) {
        config.logger.warn('existsInCache called with undefined cacheKey')
        return false
      }

      const {client, logger} = config
      const result = await client.exists(cacheKey)

      logger.debug(`Cache exists check for key "${cacheKey}": ${result === 1}`)

      return result === 1
    }

const getFromCache =
  (config: RedisConfig) =>
    async (cacheKey: string): Promise<string | null> => {
      const {client, logger} = config

      const value = await client.get(cacheKey)

      logger.debug(
        value
          ? `Cache hit for key "${cacheKey}"`
          : `Cache miss for key "${cacheKey}"`
      )

      return value
    }

const saveInCache =
  (config: RedisConfig) =>
    async (cacheKey: string, apiResponse: string): Promise<void> => {
      const {client, logger, defaultTtlSeconds} = config

      if (defaultTtlSeconds) {
        await client.set(cacheKey, apiResponse, {EX: defaultTtlSeconds})
        logger.info(
          `Value cached with TTL ${defaultTtlSeconds}s for key "${cacheKey}"`
        )
      } else {
        await client.set(cacheKey, apiResponse)
        logger.info(`Value cached with no TTL for key "${cacheKey}""`)
      }
    }

export const createRedisAdapter = (config: RedisConfig): RedisCache => {
  return {
    saveInCache: saveInCache(config),
    existsInCache: existsInCache(config),
    getFromCache: getFromCache(config),
  }
}
